import { describe, it, expect, beforeAll } from "vitest";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { FinanceDB, setDb, db } from "../db/schema";
import { DEFAULT_CATEGORIES, DEFAULT_GROUPS } from "../categories";
import { DEFAULT_RULES } from "../categorize/rules";
import { parseFile } from "./sheetParser";
import { commitImport, assignPayeeCategory } from "../db/repo";
import type { ParsedRow, RuleRow } from "../db/types";

const rules: RuleRow[] = DEFAULT_RULES.map((r, i) => ({ ...r, id: `r${i}` }));

const HEADER =
  '"Date";"Name / Description";"Account";"Counterparty";"Code";"Debit/credit";"Amount (EUR)";"Transaction type";"Notifications";"Resulting balance";"Tag"';
const csv = (...rows: string[]) => [HEADER, ...rows].join("\n");
const file = (content: string) => new File([content], "export.csv", { type: "text/csv" });

// Incasso van een onbekende zorgverzekeraar; incassant-id in de mededeling.
const INCASSO_MAART =
  '"20260227";"ZORGVERZEKERAAR ZORG EN ZEKERHEID UA";"NL06INGB0008359663";"NL28INGB0000128526";"IC";"Debit";"171,65";"SEPA direct debit";"Description: Maart 2026 Creditor ID: NL47ZZZ280502160000 Recurrent SEPA direct debit";"2877,53";""';
// Zelfde incassant, maar via een ANDERE tegenrekening (dus geen exacte IBAN-match).
const INCASSO_APRIL =
  '"20260430";"ZORG EN ZEKERHEID";"NL06INGB0008359663";"NL99INGB0000999999";"IC";"Debit";"171,65";"SEPA direct debit";"Description: April 2026 Creditor ID: NL47ZZZ280502160000 Recurrent SEPA direct debit";"2705,88";""';
// Pinbetaling bij een winkel die NIET in de trefwoordregels staat.
const SLAGERIJ_UTRECHT =
  '"20260210";"Slagerij De Vries Utrecht UTRECHT NLD";"NL06INGB0008359663";"";"BA";"Debit";"24,50";"Payment terminal";"Card sequence no.: 900";"2900,00";""';
const SLAGERIJ_AMSTERDAM =
  '"20260415";"Slagerij De Vries Amsterdam AMSTERDAM NLD";"NL06INGB0008359663";"";"BA";"Debit";"31,20";"Payment terminal";"Card sequence no.: 901";"2600,00";""';

const one = (rows: ParsedRow[]) => rows[0];

beforeAll(async () => {
  setDb(new FinanceDB({ indexedDB: new IDBFactory(), IDBKeyRange }));
  await db.open();
  await db.categoryGroups.bulkPut(DEFAULT_GROUPS);
  await db.categories.bulkPut(DEFAULT_CATEGORIES);
});

describe("parseFile — CSV-metadata", () => {
  it("leest Code, Transaction type en Creditor ID uit de ING-export", async () => {
    const rows = await parseFile(file(csv(INCASSO_MAART)), rules);
    const r = one(rows);
    expect(r.code).toBe("IC");
    expect(r.txType).toBe("SEPA direct debit");
    expect(r.creditorId).toBe("NL47ZZZ280502160000");
    // onbekende verzekeraar zonder historie/regel → geen suggestie
    expect(r.category).toBe("");
    expect(r.suggestion.source).toBe("none");
  });
});

describe("parseFile — leerlus over imports heen", () => {
  it("herkent dezelfde incassant na goedkeuring, ook bij een andere tegenrekening", async () => {
    // Import 1: verwerken + gebruiker keurt goed als 'verzekeringen'.
    const first = await parseFile(file(csv(INCASSO_MAART)), rules);
    await commitImport(first, "maart.csv");
    await assignPayeeCategory({ counterIban: "NL28INGB0000128526", merchant: one(first).merchant }, "verzekeringen");

    // Import 2: zelfde Creditor ID, andere IBAN → tier 2 (incassant-match).
    const second = await parseFile(file(csv(INCASSO_APRIL)), rules);
    const r = one(second);
    expect(r.suggestion.source).toBe("creditor-id");
    expect(r.category).toBe("verzekeringen");
    expect(r.confirmed).toBe(true); // ≥ auto-drempel
  });

  it("stelt een categorie voor op basis van een gelijkende eerdere winkelnaam", async () => {
    const first = await parseFile(file(csv(SLAGERIJ_UTRECHT)), rules);
    await commitImport(first, "feb.csv");
    await assignPayeeCategory({ counterIban: "", merchant: one(first).merchant }, "boodschappen");

    const second = await parseFile(file(csv(SLAGERIJ_AMSTERDAM)), rules);
    const r = one(second);
    expect(r.category).toBe("boodschappen");
    expect(r.suggestion.source).toBe("history-fuzzy");
    expect(r.suggestion.confidence).toBeGreaterThanOrEqual(0.5);
  });
});
