import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { setRecurringBudget } from "../db/repo";
import { eur } from "../lib/format";
import { Ic } from "./Ic";
import type { Category } from "../db/types";

/* Bottom-sheet om het maandbudget van één categorie te zetten (mobiel). Hergebruikt
 * de sheet-stijl van de categorie-keuze. Schrijft via setRecurringBudget. */
export function BudgetSheet({ open, cat, monthly, reference, onClose }: {
  open: boolean;
  cat: Category | null;
  monthly: number;
  reference: number | null;
  onClose: () => void;
}) {
  const [val, setVal] = useState(monthly);

  useEffect(() => { if (open) setVal(monthly); }, [open, monthly]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open || !cat) return null;

  function save() {
    setRecurringBudget(cat!.id, val);
    onClose();
  }

  return createPortal(
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Budget voor ${cat.name}`}>
        <div className="sheet-grip" />
        <div className="sheet-h">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 11, height: 11, borderRadius: "50%", background: cat.color, flex: "none" }} />
            {cat.name}
          </span>
          <button className="sheet-x" onClick={onClose} aria-label="Sluiten"><Ic name="x" size={18} /></button>
        </div>
        <div style={{ padding: "6px 4px 4px" }}>
          <label className="m-bud-lbl" htmlFor="m-bud-input">Maandbudget</label>
          <div className="m-bud-input">
            <span className="m-bud-eur">€</span>
            <input id="m-bud-input" type="number" min={0} step={10} value={val} autoFocus
              aria-label={`Budget voor ${cat.name}`} className="tnum"
              onChange={(e) => setVal(Number(e.target.value) || 0)}
              onKeyDown={(e) => { if (e.key === "Enter") save(); }} />
          </div>
          {reference != null && (
            <div className="m-bud-hint">Nibud-richtbedrag: {eur(reference)}/mnd</div>
          )}
          <button className="btn btn-primary m-bud-save" onClick={save}>Opslaan</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
