/* Leren van je eigen indeel-historie. Bouwt een lichte index over reeds
 * gecategoriseerde tegenpartijen en matcht een nieuwe merchant-naam daartegen
 * (fuzzy, op woord-niveau). Zo krijgt bv. "Jumbo Vleuten" de categorie van het
 * eerder ingedeelde "Jumbo De Meern". Volledig lokaal — geen externe API. */
import type { Transaction, TxRow } from "../db/types";
import { buildPayeeOverview } from "../helpers/payees";

/* Veelvoorkomende ruis-woorden die niets over de categorie zeggen. IDF vangt de
 * rest al af; deze lijst houdt de index alleen wat schoner. */
const STOP = new Set(["de", "het", "een", "van", "der", "den", "the", "and", "bv", "nv", "ua", "en"]);

export interface HistoryPayee {
  tokens: string[];
  categoryId: string;
  name: string;
}

export interface HistoryIndex {
  payees: HistoryPayee[];
  df: Map<string, number>; // document-frequentie per token (payee = document)
  nDocs: number;
}

/* Naam → betekenisdragende tokens (lowercase, ≥2 tekens, geen stopwoord). */
export function tokenize(name: string): string[] {
  return (name || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !STOP.has(t));
}

/* Trainingslabels = de "meest voorkomende categorie per tegenpartij" die
 * buildPayeeOverview al berekent (hergebruik). */
export function buildHistoryIndex(
  transactions: Transaction[],
  payeeMap: Map<string, string>,
): HistoryIndex {
  const overview = buildPayeeOverview(transactions, payeeMap).filter((p) => p.categoryId);
  const payees: HistoryPayee[] = [];
  const df = new Map<string, number>();
  for (const p of overview) {
    const tokens = tokenize(p.name);
    if (!tokens.length) continue;
    payees.push({ tokens, categoryId: p.categoryId, name: p.name });
    for (const t of new Set(tokens)) df.set(t, (df.get(t) ?? 0) + 1);
  }
  return { payees, df, nDocs: payees.length };
}

/* Vind de best gelijkende, eerder ingedeelde tegenpartij (IDF-gewogen cosine over
 * tokens). Retourneert diens categorie, een score 0..1 en een voorbeeldnaam. */
export function fuzzyMatchHistory(
  merchant: string,
  idx: HistoryIndex,
): { categoryId: string; score: number; example: string } {
  const empty = { categoryId: "", score: 0, example: "" };
  const toks = tokenize(merchant);
  if (!toks.length || !idx.payees.length) return empty;

  const idf = (t: string) => Math.log((idx.nDocs + 1) / ((idx.df.get(t) ?? 0) + 1)) + 1;
  const q = new Map<string, number>();
  for (const t of toks) q.set(t, idf(t));
  let qNorm = 0;
  for (const w of q.values()) qNorm += w * w;

  let best = empty;
  for (const p of idx.payees) {
    const pSet = new Set(p.tokens);
    let shared = 0;
    let pNorm = 0;
    for (const t of pSet) pNorm += idf(t) ** 2;
    for (const [t, w] of q) if (pSet.has(t)) shared += w * idf(t);
    if (shared <= 0) continue;
    const sim = shared / Math.sqrt(qNorm * pNorm);
    if (sim > best.score) best = { categoryId: p.categoryId, score: sim, example: p.name };
  }
  return best;
}

/* creditorId → categoryId uit reeds ingedeelde transacties (meest voorkomende
 * categorie per incassant). Basis voor de exacte incassant-match tijdens import.
 * Accepteert zowel DB-rijen (TxRow) als app-model-transacties. */
export function buildCreditorMap(txRows: Pick<TxRow, "creditorId" | "category">[]): Map<string, string> {
  const byCred = new Map<string, Map<string, number>>();
  for (const t of txRows) {
    if (!t.creditorId || !t.category) continue;
    let cc = byCred.get(t.creditorId);
    if (!cc) byCred.set(t.creditorId, (cc = new Map()));
    cc.set(t.category, (cc.get(t.category) ?? 0) + 1);
  }
  const out = new Map<string, string>();
  for (const [cred, cc] of byCred) {
    let best = "";
    let bestN = 0;
    for (const [cat, n] of cc) if (n > bestN) { best = cat; bestN = n; }
    if (best) out.set(cred, best);
  }
  return out;
}
