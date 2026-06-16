import { useMemo, useState } from "react";
import { useApp } from "../state/AppContext";
import { eur, eurSign, fmtDate, monthKeyLabelFull } from "../lib/format";
import { txKey } from "../helpers/aggregations";
import { assignPayeeCategory } from "../db/repo";
import { CatTag } from "../components/CatTag";
import { CatSelect } from "../components/CatSelect";
import { Dropdown } from "../components/Dropdown";
import { MerchantAv } from "../components/MerchantAv";
import { Ic } from "../components/Ic";
import { Button } from "../components/Button";
import { SwipeRow } from "../components/SwipeRow";
import { CategorySheet } from "../components/CategorySheet";
import { useMediaQuery } from "../charts/useMediaQuery";
import type { Transaction } from "../db/types";

export function Transactions() {
  const { transactions, categories, catMap } = useApp();
  const isMobile = useMediaQuery("(max-width: 860px)");
  const [q, setQ] = useState("");
  const [monthSel, setMonthSel] = useState<string>(""); // "" = nieuwste maand in data; "alle" = alles
  const [catFilter, setCatFilter] = useState("alle");
  const [onlyUncat, setOnlyUncat] = useState(false);
  const [sheetTx, setSheetTx] = useState<Transaction | null>(null);

  // alleen maanden die echt in de database zitten (nieuwste eerst)
  const monthsInData = useMemo(
    () => [...new Set(transactions.map((t) => txKey(t)))].sort().reverse(),
    [transactions],
  );
  const selectedMonth = monthSel || monthsInData[0] || "alle";

  let rows = transactions;
  if (selectedMonth !== "alle") rows = rows.filter((t) => txKey(t) === selectedMonth);
  if (catFilter !== "alle") rows = rows.filter((t) => (catFilter === "leeg" ? !t.category : t.category === catFilter));
  if (onlyUncat) rows = rows.filter((t) => !t.category);
  if (q.trim()) {
    const s = q.toLowerCase();
    rows = rows.filter((t) => t.merchant.toLowerCase().includes(s) || (t.note || "").toLowerCase().includes(s) || t.rawDescription.toLowerCase().includes(s));
  }

  const uncatCount = transactions.filter((t) => !t.category && (selectedMonth === "alle" || txKey(t) === selectedMonth)).length;
  const totalOut = rows.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalIn = rows.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);

  function categorize(t: Transaction, catId: string) {
    assignPayeeCategory({ counterIban: t.counterIban, merchant: t.merchant }, catId);
    setSheetTx(null);
  }

  // ── Mobiel: zoek + filter-chips + veegbare lijst (alle maanden, filter via chips) ──
  if (isMobile) {
    const uncatAll = transactions.filter((t) => !t.category).length;
    const counts: Record<string, number> = {};
    transactions.forEach((t) => { if (t.category) counts[t.category] = (counts[t.category] || 0) + 1; });
    const chipCats = categories.filter((c) => counts[c.id]).sort((a, b) => counts[b.id] - counts[a.id]);

    let mRows = transactions;
    if (onlyUncat) mRows = mRows.filter((t) => !t.category);
    else if (catFilter !== "alle") mRows = mRows.filter((t) => (catFilter === "leeg" ? !t.category : t.category === catFilter));
    if (q.trim()) {
      const s = q.toLowerCase();
      mRows = mRows.filter((t) => t.merchant.toLowerCase().includes(s) || (t.note || "").toLowerCase().includes(s) || t.rawDescription.toLowerCase().includes(s));
    }

    const allActive = catFilter === "alle" && !onlyUncat;
    const chip = (key: string, label: string, active: boolean, onClick: () => void, badge?: number) => (
      <button key={key} type="button" className={"m-chip" + (active ? " active" : "")} onClick={onClick}>
        {label}
        {badge ? <span className="m-chip-badge">{badge}</span> : null}
      </button>
    );

    return (
      <div className="content-inner fade-in m-tx">
        <div className="m-search">
          <span className="m-search-ic"><Ic name="search" size={17} /></span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zoek op naam of notitie…" aria-label="Zoeken" />
        </div>
        <div className="m-chips scroll">
          {chip("alle", "Alle", allActive, () => { setCatFilter("alle"); setOnlyUncat(false); })}
          {chip("leeg", "Niet ingedeeld", onlyUncat, () => { setOnlyUncat(true); setCatFilter("alle"); }, uncatAll || undefined)}
          {chipCats.map((c) => chip(c.id, c.name, !onlyUncat && catFilter === c.id, () => { setCatFilter(c.id); setOnlyUncat(false); }))}
        </div>

        <div className="card m-rt m-txlist">
          {mRows.length === 0 && <div className="empty">Geen transacties gevonden.</div>}
          {mRows.map((t) => {
            const c = catMap[t.category];
            return (
              <SwipeRow key={t.id} actionLabel="Indelen" onAction={() => setSheetTx(t)}>
                <div className={"m-tx-row" + (t.category ? "" : " uncat")}>
                  <MerchantAv t={t} />
                  <div className="m-tx-main">
                    <div className="m-tx-name">{t.merchant}</div>
                    <div className="m-tx-cat">{c ? c.name : "Veeg om in te delen"}</div>
                  </div>
                  <div className={"m-tx-amt tnum " + (t.amount >= 0 ? "pos" : "")}>{eurSign(t.amount, 2)}</div>
                </div>
              </SwipeRow>
            );
          })}
        </div>

        <CategorySheet
          open={!!sheetTx}
          title={sheetTx ? `Categorie voor ${sheetTx.merchant}` : ""}
          current={sheetTx?.category}
          onPick={(catId) => sheetTx && categorize(sheetTx, catId)}
          onClose={() => setSheetTx(null)}
        />
      </div>
    );
  }

  return (
    <div className="content-inner fade-in">
      {uncatCount > 0 && (
        <div className="notice" style={{ marginBottom: 18 }}>
          <span className="ni"><Ic name="info" size={20} /></span>
          <div className="nt">
            <b>{uncatCount} transactie{uncatCount === 1 ? "" : "s"} wacht{uncatCount === 1 ? "" : "en"} op indeling.</b> Klik op een categorie-label om ze toe te wijzen — daarna tellen ze mee in je budgetten.
            <Button variant="ghost" style={{ marginLeft: 10, padding: "3px 10px", color: "var(--blue)" }}
              onClick={() => setOnlyUncat(true)}>Toon alleen deze</Button>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 320 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--faint)" }}><Ic name="search" size={17} /></span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zoek op naam of notitie…"
              style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "9px 12px 9px 36px", fontSize: 14, outline: "none", background: "var(--subtle)" }} />
          </div>
          <Dropdown
            value={selectedMonth}
            onChange={setMonthSel}
            ariaLabel="Filter op maand"
            minWidth={170}
            options={[{ value: "alle", label: "Alle maanden" }, ...monthsInData.map((mk) => ({ value: mk, label: monthKeyLabelFull(mk) }))]}
          />
          <Dropdown
            value={catFilter}
            onChange={setCatFilter}
            ariaLabel="Filter op categorie"
            options={[
              { value: "alle", label: "Alle categorieën", color: "var(--faint)" },
              { value: "leeg", label: "Niet ingedeeld", color: "var(--faint)" },
              ...categories.map((c) => ({ value: c.id, label: c.name, color: c.color })),
            ]}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 7, marginLeft: "auto", fontSize: 13, fontWeight: 600, color: "var(--body)", cursor: "pointer" }}>
            <input type="checkbox" checked={onlyUncat} onChange={(e) => setOnlyUncat(e.target.checked)} style={{ accentColor: "var(--blue)", width: 16, height: 16 }} />
            Alleen niet ingedeeld
          </label>
        </div>

        <div style={{ padding: "8px 10px" }}>
          <table className="tbl tbl-cards">
            <thead>
              <tr>
                <th style={{ paddingLeft: 14 }}>Transactie</th>
                <th>Datum</th>
                <th>Categorie</th>
                <th style={{ textAlign: "right", paddingRight: 14 }}>Bedrag</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={4}><div className="empty">Geen transacties gevonden voor deze filters.</div></td></tr>
              )}
              {rows.map((t) => (
                <tr className="row" key={t.id} style={!t.category ? { background: "var(--orange-tint)" } : undefined}>
                  <td className="td-primary" style={{ width: "42%" }}>
                    <div className="merchant">
                      <MerchantAv t={t} />
                      <div>
                        <div className="mn">{t.merchant}</div>
                        {t.note ? <div className="md">{t.note}</div> : <div className="md" style={{ fontFamily: "monospace", fontSize: 11, color: "var(--faint)" }}>{t.rawDescription.slice(0, 48)}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ color: "var(--muted)", fontWeight: 400 }} className="tnum" data-label="Datum">{fmtDate(t.date)}</td>
                  <td data-label="Categorie">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {t.category === "inkomen" ? (
                        <CatTag catId="inkomen" />
                      ) : t.category === "sparen" ? (
                        <CatTag catId="sparen" />
                      ) : (
                        <CatSelect
                          value={t.category}
                          onChange={(c) => assignPayeeCategory({ counterIban: t.counterIban, merchant: t.merchant }, c)}
                        />
                      )}
                    </div>
                  </td>
                  <td className={"amt tnum " + (t.amount >= 0 ? "pos" : "neg")} style={{ paddingRight: 14 }} data-label="Bedrag">{eurSign(t.amount, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="tbl-foot" style={{ display: "flex", gap: 28, padding: "14px 24px", borderTop: "1px solid var(--line)", fontSize: 13.5 }}>
          <span style={{ color: "var(--muted)" }}>{rows.length} transacties</span>
          <span style={{ marginLeft: "auto", color: "var(--muted)" }}>Inkomsten <b className="tnum" style={{ color: "var(--pos)" }}>{eur(totalIn, 2)}</b></span>
          <span style={{ color: "var(--muted)" }}>Uitgaven <b className="tnum" style={{ color: "var(--ink)" }}>{eur(totalOut, 2)}</b></span>
        </div>
      </div>
    </div>
  );
}
