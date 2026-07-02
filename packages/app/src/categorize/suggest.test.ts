import { describe, it, expect } from "vitest";
import { buildHistoryIndex, buildCreditorMap, fuzzyMatchHistory } from "./history";
import { suggestCategory, CONF_SUGGEST, CONF_AUTO, type SuggestContext } from "./suggest";
import { DEFAULT_RULES } from "./rules";
import { extractCreditorId } from "../import/merchantClean";
import type { MappedRow } from "../import/ingProfile";
import type { RuleRow, Transaction, TxRow } from "../db/types";

const rules: RuleRow[] = DEFAULT_RULES.map((r, i) => ({ ...r, id: `r${i}` }));

function tx(p: Partial<Transaction>): Transaction {
  return {
    id: "t", date: "2026-01-01", merchant: "", rawDescription: "", category: "",
    amount: -10, auto: true, note: "", counterIban: "", accountIban: "",
    importBatchId: "b", dedupeHash: "h", ...p,
  };
}

function row(p: Partial<MappedRow>): MappedRow {
  return { date: "2026-01-01", rawDescription: "", merchant: "", amount: -10, counterIban: "", accountIban: "", balance: null, ...p };
}

function ctx(over: Partial<SuggestContext>): SuggestContext {
  return {
    payeeMap: new Map(),
    creditorMap: new Map(),
    history: buildHistoryIndex([], new Map()),
    rules,
    vasteLastenCats: new Set(["wonen", "verzekeringen", "abonnementen", "belastingen", "aflossingen"]),
    ...over,
  };
}

describe("extractCreditorId", () => {
  it("haalt Creditor ID uit een SEPA-mededeling", () => {
    expect(extractCreditorId("Name: X Description: Y Creditor ID: NL47ZZZ280502160000 Recurrent")).toBe("NL47ZZZ280502160000");
  });
  it("herkent ook 'Incassant ID'", () => {
    expect(extractCreditorId("Incassant ID: NL08ZZZ091197310000")).toBe("NL08ZZZ091197310000");
  });
  it("leeg wanneer afwezig (pinbetaling)", () => {
    expect(extractCreditorId("Card sequence no.: 900 Google Pay")).toBe("");
  });
});

describe("fuzzyMatchHistory", () => {
  it("matcht een naamvariant op dezelfde winkelketen", () => {
    const history = buildHistoryIndex(
      [tx({ merchant: "Jumbo De Meern", category: "boodschappen" })],
      new Map(),
    );
    const m = fuzzyMatchHistory("Jumbo Vleuten", history);
    expect(m.categoryId).toBe("boodschappen");
    expect(m.score).toBeGreaterThan(0);
    expect(m.example).toBe("Jumbo De Meern");
  });
});

describe("suggestCategory", () => {
  it("tier 1: exacte tegenpartij-mapping wint met confidence 1", () => {
    const s = suggestCategory(
      row({ counterIban: "NL00BANK0000000001", merchant: "Wie dan ook" }),
      ctx({ payeeMap: new Map([["iban:NL00BANK0000000001", "wonen"]]) }),
    );
    expect(s).toMatchObject({ categoryId: "wonen", confidence: 1, source: "payee-exact" });
  });

  it("tier 2: zelfde incassant (Creditor ID) → hoge confidence", () => {
    const s = suggestCategory(
      row({ merchant: "Nieuwe naam BV", creditorId: "NL47ZZZ280502160000", amount: -50, code: "IC" }),
      ctx({ creditorMap: new Map([["NL47ZZZ280502160000", "verzekeringen"]]) }),
    );
    expect(s.categoryId).toBe("verzekeringen");
    expect(s.confidence).toBeGreaterThanOrEqual(CONF_AUTO);
    expect(s.source).toBe("creditor-id");
  });

  it("tier 3: nieuwe Jumbo-variant → voorgesteld boodschappen via historie", () => {
    const history = buildHistoryIndex([tx({ merchant: "Jumbo De Meern", category: "boodschappen" })], new Map());
    const s = suggestCategory(row({ merchant: "Jumbo Vleuten" }), ctx({ history }));
    expect(s.categoryId).toBe("boodschappen");
    expect(s.confidence).toBeGreaterThanOrEqual(CONF_SUGGEST);
    expect(s.source).toMatch(/history-fuzzy|keyword/);
  });

  it("keyword + historie eens → hogere confidence dan één signaal", () => {
    const history = buildHistoryIndex([tx({ merchant: "Albert Heijn 1234", category: "boodschappen" })], new Map());
    const s = suggestCategory(row({ merchant: "Albert Heijn 9999", rawDescription: "ALBERT HEIJN 9999" }), ctx({ history }));
    expect(s.categoryId).toBe("boodschappen");
    expect(s.confidence).toBeGreaterThanOrEqual(CONF_AUTO); // beide signalen wijzen dezelfde kant op
  });

  it("type-prior: positieve overboeking met SALARIS → inkomen", () => {
    const s = suggestCategory(
      row({ merchant: "Delaware Consulting", rawDescription: "Delaware Consulting BV — SALARIS mei", amount: 3200, code: "GT", txType: "Transfer" }),
      ctx({}),
    );
    expect(s.categoryId).toBe("inkomen");
    expect(s.confidence).toBeGreaterThanOrEqual(CONF_SUGGEST);
  });

  it("geen enkel signaal → geen suggestie", () => {
    const s = suggestCategory(row({ merchant: "Volkomen Onbekend Xyz", rawDescription: "iets vaags" }), ctx({}));
    expect(s.categoryId).toBe("");
    expect(s.confidence).toBe(0);
    expect(s.source).toBe("none");
  });
});

describe("buildCreditorMap", () => {
  it("kiest de meest voorkomende categorie per incassant", () => {
    const rows: TxRow[] = [
      { id: "1", date: "2026-01-01", merchant: "a", rawDescription: "", category: "verzekeringen", amountCents: -100, auto: true, note: "", counterIban: "", accountIban: "", importBatchId: "b", dedupeHash: "h1", creditorId: "NL47ZZZ280502160000" },
      { id: "2", date: "2026-02-01", merchant: "a", rawDescription: "", category: "verzekeringen", amountCents: -100, auto: true, note: "", counterIban: "", accountIban: "", importBatchId: "b", dedupeHash: "h2", creditorId: "NL47ZZZ280502160000" },
      { id: "3", date: "2026-03-01", merchant: "a", rawDescription: "", category: "overig", amountCents: -100, auto: true, note: "", counterIban: "", accountIban: "", importBatchId: "b", dedupeHash: "h3", creditorId: "NL47ZZZ280502160000" },
    ];
    const map = buildCreditorMap(rows);
    expect(map.get("NL47ZZZ280502160000")).toBe("verzekeringen");
  });
});
