import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { updateGoal, moveGoalPriority, deleteGoal } from "../db/repo";
import { Ic } from "./Ic";

/* Bottom-sheet om één spaardoel te bewerken (mobiel): naam, doelbedrag, prioriteit
 * en verwijderen. Schrijft via de goal-repo. */
export function GoalSheet({ open, goalId, name, target, canUp, canDown, onClose }: {
  open: boolean;
  goalId: string | null;
  name: string;
  target: number;
  canUp: boolean;
  canDown: boolean;
  onClose: () => void;
}) {
  const [nm, setNm] = useState(name);
  const [tg, setTg] = useState(target);

  useEffect(() => { if (open) { setNm(name); setTg(target); } }, [open, goalId, name, target]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open || !goalId) return null;

  function save() {
    updateGoal(goalId!, { name: nm.trim() || "Naamloos doel", target: tg });
    onClose();
  }

  return createPortal(
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Doel bewerken">
        <div className="sheet-grip" />
        <div className="sheet-h">
          <span>Doel bewerken</span>
          <button className="sheet-x" onClick={onClose} aria-label="Sluiten"><Ic name="x" size={18} /></button>
        </div>
        <div style={{ padding: "6px 4px 4px" }}>
          <label className="m-bud-lbl" htmlFor="m-goal-name">Naam</label>
          <div className="m-bud-input">
            <input id="m-goal-name" type="text" value={nm} placeholder="Naam je doel"
              onChange={(e) => setNm(e.target.value)} style={{ fontSize: 16 }} />
          </div>

          <label className="m-bud-lbl" htmlFor="m-goal-target" style={{ marginTop: 14 }}>Doelbedrag</label>
          <div className="m-bud-input">
            <span className="m-bud-eur">€</span>
            <input id="m-goal-target" type="number" min={0} step={500} value={tg} className="tnum"
              aria-label="Doelbedrag"
              onChange={(e) => setTg(Number(e.target.value) || 0)}
              onKeyDown={(e) => { if (e.key === "Enter") save(); }} />
          </div>

          <div className="m-goal-reorder">
            <button type="button" className="btn" disabled={!canUp} onClick={() => moveGoalPriority(goalId!, "up")}>
              <Ic name="chevronUp" size={16} /> Hogere prioriteit
            </button>
            <button type="button" className="btn" disabled={!canDown} onClick={() => moveGoalPriority(goalId!, "down")}>
              <Ic name="chevronDown" size={16} /> Lagere prioriteit
            </button>
          </div>

          <div className="m-goal-actions">
            <button type="button" className="btn m-goal-del" onClick={() => { deleteGoal(goalId!); onClose(); }}>
              <Ic name="trash" size={16} /> Verwijderen
            </button>
            <button type="button" className="btn btn-primary m-goal-save" onClick={save}>Opslaan</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
