import * as XLSX from "xlsx";
import { mapIngRow, type RawRecord } from "./ingProfile";
import { dedupeHash } from "../lib/id";
import { toCents } from "../lib/money";
import { db } from "../db/schema";
import { rowToTx } from "../db/map";
import { existingPayeeMap } from "../db/repo";
import { buildHistoryIndex, buildCreditorMap } from "../categorize/history";
import { suggestCategory, CONF_AUTO, CONF_SUGGEST, type SuggestContext } from "../categorize/suggest";
import type { ParsedRow, RuleRow } from "../db/types";

/* Lees een Excel-/CSV-bestand in tot rij-objecten (header → waarde). */
async function readWorkbook(file: File): Promise<RawRecord[]> {
  const isCsv = /\.csv$/i.test(file.name) || file.type === "text/csv";
  const wb = isCsv
    ? XLSX.read(await file.text(), { type: "string", raw: true })
    : XLSX.read(await file.arrayBuffer(), { type: "array", raw: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<RawRecord>(sheet, { defval: "", raw: false });
}

/* Parse een bankexport tot ParsedRow[]: bepaalt per rij een categorie-suggestie
 * (met betrouwbaarheid), vult die vast voor te-controleren/auto-rijen, en markeert
 * duplicaten. Eén scan over de transacties voedt zowel dedupe als de suggestie-context. */
export async function parseFile(file: File, rules: RuleRow[]): Promise<ParsedRow[]> {
  const records = await readWorkbook(file);
  const txRows = await db.transactions.toArray();
  const payeeMap = await existingPayeeMap();
  const cats = await db.categories.toArray();

  const hashes = new Set(txRows.map((t) => t.dedupeHash));
  const ctx: SuggestContext = {
    payeeMap,
    creditorMap: buildCreditorMap(txRows),
    history: buildHistoryIndex(txRows.map(rowToTx), payeeMap),
    rules,
    vasteLastenCats: new Set(cats.filter((c) => c.groupId === "grp-vaste-lasten").map((c) => c.id)),
  };
  const seenInFile = new Set<string>();

  const rows: ParsedRow[] = [];
  for (const rec of records) {
    const m = mapIngRow(rec);
    if (!m.date || !m.rawDescription) continue;
    const cents = toCents(m.amount);
    const hash = dedupeHash([m.date, cents, m.counterIban, m.rawDescription]);
    const suggestion = suggestCategory(m, ctx);
    const duplicate = hashes.has(hash) || seenInFile.has(hash);
    seenInFile.add(hash);
    rows.push({
      date: m.date,
      rawDescription: m.rawDescription,
      merchant: m.merchant,
      amount: m.amount,
      counterIban: m.counterIban,
      accountIban: m.accountIban,
      category: suggestion.confidence >= CONF_SUGGEST ? suggestion.categoryId : "",
      suggestion,
      confirmed: suggestion.confidence >= CONF_AUTO, // ≥ auto-drempel telt als afgehandeld
      dedupeHash: hash,
      duplicate,
      balance: m.balance,
      code: m.code,
      txType: m.txType,
      creditorId: m.creditorId,
    });
  }
  // nieuwste eerst
  rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return rows;
}
