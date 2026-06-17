import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../state/AppContext";
import { assignPayeeCategory } from "../db/repo";
import type { PayeeOverview } from "../helpers/payees";
import type { Category } from "../db/types";
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
  const { categories, categoryGroups } = useApp();
  const [sel, setSel] = useState<string>("");

  useEffect(() => { if (open && payee) setSel(payee.categoryId || ""); }, [open, payee]);
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
