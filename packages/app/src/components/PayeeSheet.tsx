import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../state/AppContext";
import { assignPayeeCategory } from "../db/repo";
import { payeeKey, type PayeeOverview } from "../helpers/payees";
import { buildHistoryIndex, buildCreditorMap } from "../categorize/history";
import { suggestCategory, CONF_SUGGEST, type SuggestContext } from "../categorize/suggest";
import type { Category, Suggestion } from "../db/types";
import type { MappedRow } from "../import/ingProfile";
import { Ic } from "./Ic";

const byName = (a: Category, b: Category) => a.name.localeCompare(b.name, "nl");

/* Bottom-sheet om één tegenpartij een categorie toe te wijzen (mobiel): infobanner met de
 * impact (geldt voor álle transacties), een radiolijst met categorieën (incl. inkomen) en
 * een bevestigknop. De keuze raakt veel transacties, vandaar de expliciete bevestigstap. */
export function PayeeSheet({ open, payee, onClose }: {
  open: boolean;
  payee: PayeeOverview | null;
  onClose: () => void;
}) {
  const { categories, categoryGroups, catMap, transactions, payeeMap, rules } = useApp();
  const [sel, setSel] = useState<string>("");

  // Suggestie voor een nog niet-ingedeelde tegenpartij: dezelfde lokale engine als bij import
  // (trefwoord + gelijkende eigen historie + type-prior). Alleen berekend wanneer nodig.
  const suggestion = useMemo<Suggestion | null>(() => {
    if (!open || !payee || payee.categoryId) return null;
    const mine = transactions.filter((t) => payeeKey(t) === payee.key);
    const t = mine[0]; // nieuwste (transactions is nieuwste-eerst gesorteerd)
    if (!t) return null;
    const m: MappedRow = {
      date: t.date, rawDescription: t.rawDescription, merchant: t.merchant, amount: t.amount,
      counterIban: t.counterIban, accountIban: t.accountIban, balance: null,
      txType: t.txType, creditorId: t.creditorId,
    };
    const ctx: SuggestContext = {
      payeeMap,
      creditorMap: buildCreditorMap(transactions),
      history: buildHistoryIndex(transactions, payeeMap),
      rules,
      vasteLastenCats: new Set(categories.filter((c) => c.groupId === "grp-vaste-lasten").map((c) => c.id)),
    };
    const s = suggestCategory(m, ctx);
    return s.confidence >= CONF_SUGGEST && s.categoryId ? s : null;
  }, [open, payee, transactions, payeeMap, rules, categories]);

  useEffect(() => {
    if (open && payee) setSel(payee.categoryId || suggestion?.categoryId || "");
  }, [open, payee, suggestion]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open || !payee) return null;

  function assign() {
    if (!sel || !payee) return;
    assignPayeeCategory({ counterIban: payee.iban, merchant: payee.name, name: payee.name }, sel);
    onClose();
  }

  return createPortal(
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Categorie toewijzen">
        <div className="sheet-grip" />
        <div className="sheet-h">
          <div style={{ minWidth: 0 }}>
            <div>Categorie toewijzen</div>
            <div className="m-sheet-sub">{payee.name} · <span className="mono">{payee.iban || "Pinbetaling"}</span></div>
          </div>
          <button className="sheet-x" onClick={onClose} aria-label="Sluiten"><Ic name="x" size={18} /></button>
        </div>

        {suggestion && (
          <div className="m-info-banner" style={{ background: "var(--blue-soft)", color: "var(--blue)" }}>
            <Ic name="sparkle" size={16} />
            <div>
              Voorstel: <b>{catMap[suggestion.categoryId]?.name ?? "—"}</b>
              {suggestion.reason ? <> · {suggestion.reason}</> : null}. Controleer en bevestig.
            </div>
          </div>
        )}

        <div className="m-info-banner">
          <Ic name="info" size={16} />
          <div>Geldt voor alle <b>{payee.count} transactie{payee.count === 1 ? "" : "s"}</b> — nu én bij toekomstige imports.</div>
        </div>

        <div className="sheet-body scroll">
          {categoryGroups.map((g) => {
            const members = categories.filter((c) => c.groupId === g.id).sort(byName);
            if (members.length === 0) return null;
            return (
              <div key={g.id}>
                <div className="cat-group">{g.name}</div>
                {members.map((c) => (
                  <button key={c.id} type="button" className={"cat-opt" + (sel === c.id ? " sel" : "")} onClick={() => setSel(c.id)}>
                    <span className="dot" style={{ background: c.color }} />
                    {c.name}
                    {sel === c.id && <span className="ck"><Ic name="check" size={15} /></span>}
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        <button type="button" className="btn btn-primary m-sheet-cta" disabled={!sel} onClick={assign}>
          <Ic name="check" size={18} strokeWidth={2.3} />
          Toewijzen aan {payee.count} transactie{payee.count === 1 ? "" : "s"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
