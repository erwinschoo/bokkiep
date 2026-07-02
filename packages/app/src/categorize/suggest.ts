/* Suggestie-engine: bepaalt de meest logische categorie voor (nieuwe) tegenpartijen
 * bij import, met een betrouwbaarheid en uitleg. Gelaagd en volledig lokaal:
 * identiteitssignalen (tier 1/2) winnen direct; daaronder stemmen heuristieken. */
import type { RuleRow, Suggestion, SuggestSource } from "../db/types";
import type { MappedRow } from "../import/ingProfile";
import { matchRule } from "./rules";
import { payeeKey } from "../helpers/payees";
import { fuzzyMatchHistory, type HistoryIndex } from "./history";

export interface SuggestContext {
  payeeMap: Map<string, string>;    // key → categoryId (eerder ingedeelde tegenpartijen)
  creditorMap: Map<string, string>; // creditorId → categoryId (eerdere incassanten)
  history: HistoryIndex;            // fuzzy-index over eigen historie
  rules: RuleRow[];                 // trefwoordregels
  vasteLastenCats: Set<string>;     // category-ids in de groep "Vaste lasten"
}

/* Confidence-banden — gedeeld met de import-UI. */
export const CONF_AUTO = 0.9;    // ≥ : automatisch ingedeeld (geen review nodig)
export const CONF_SUGGEST = 0.5; // ≥ : voorgesteld (voorgevuld + badge); < : onbekend

const clamp = (n: number) => Math.max(0, Math.min(0.9, n));

export function suggestCategory(m: MappedRow, ctx: SuggestContext): Suggestion {
  // Tier 1 — exacte tegenpartij-mapping (identiteit) wint van alles.
  const exact = ctx.payeeMap.get(payeeKey({ counterIban: m.counterIban, merchant: m.merchant }));
  if (exact) return { categoryId: exact, confidence: 1, reason: "Eerder ingedeeld", source: "payee-exact" };

  // Tier 2 — zelfde SEPA-incassant als eerder: stabiel over naamvarianten heen.
  if (m.creditorId) {
    const c = ctx.creditorMap.get(m.creditorId);
    if (c) return { categoryId: c, confidence: 0.97, reason: "Zelfde incassant als eerder", source: "creditor-id" };
  }

  // Tier 3 — gewogen stemmen over heuristische signalen; hoogste score wint.
  interface Vote { score: number; reason: string; source: SuggestSource; sources: Set<SuggestSource>; }
  const votes = new Map<string, Vote>();
  const add = (cat: string, weight: number, reason: string, source: SuggestSource) => {
    if (!cat || weight <= 0) return;
    const cur = votes.get(cat);
    if (!cur) votes.set(cat, { score: weight, reason, source, sources: new Set([source]) });
    else { cur.score += weight; cur.sources.add(source); } // eerst toegevoegde (sterkste) reden blijft
  };

  // (c) trefwoordregel
  const rule = matchRule({ merchant: m.merchant, rawDescription: m.rawDescription }, ctx.rules);
  if (rule) add(rule.categoryId, 0.7, `Herkend: "${rule.pattern}"`, "keyword");

  // (b) fuzzy match tegen eigen historie
  const fz = fuzzyMatchHistory(m.merchant, ctx.history);
  if (fz.categoryId) add(fz.categoryId, 0.5 + 0.4 * Math.min(1, fz.score), `Lijkt op "${fz.example}"`, "history-fuzzy");

  // (d) type-prior: salaris/inkomen bij een positieve overboeking
  const isTransfer = m.code === "GT" || /transfer|overschrijving/i.test(m.txType || "");
  if (m.amount > 0 && isTransfer && /\bSALARIS\b|\bLOON\b|\bSALARY\b/i.test(m.rawDescription)) {
    add("inkomen", 0.85, "Salaris / inkomen herkend", "type-prior");
  }

  if (votes.size === 0) return { categoryId: "", confidence: 0, reason: "", source: "none" };

  // disambiguator: een SEPA-incasso is doorgaans een vaste last → kleine boost.
  const isIncasso = m.amount < 0 && (m.code === "IC" || /direct debit|incasso/i.test(m.txType || ""));
  if (isIncasso) for (const [cat, v] of votes) if (ctx.vasteLastenCats.has(cat)) v.score += 0.1;

  const ranked = [...votes.entries()].sort((a, b) => b[1].score - a[1].score);
  const [topCat, top] = ranked[0];
  const agreement = top.sources.size >= 2 ? 1.15 : 1; // meerdere onafhankelijke signalen → zekerder
  return { categoryId: topCat, confidence: clamp(top.score * agreement), reason: top.reason, source: top.source };
}
