import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../state/AppContext";
import { addRule, updateRule, deleteRule } from "../db/repo";
import type { Category, RuleRow } from "../db/types";
import { Ic } from "./Ic";

const byName = (a: Category, b: Category) => a.name.localeCompare(b.name, "nl");

/* Bottom-sheet om een categoriseer-regel toe te voegen of te bewerken (mobiel):
 * veld, type-match, patroon, categorie en prioriteit. */
export function RuleEditSheet({ open, rule, onClose }: {
  open: boolean;
  rule: RuleRow | null;                 // null = nieuwe regel
  onClose: () => void;
}) {
  const { categories, categoryGroups } = useApp();
  const [field, setField] = useState<RuleRow["field"]>("rawDescription");
  const [matchType, setMatchType] = useState<RuleRow["matchType"]>("contains");
  const [pattern, setPattern] = useState("");
  const [categoryId, setCategoryId] = useState("overig");
  const [priority, setPriority] = useState(50);

  useEffect(() => {
    if (!open) return;
    setField(rule?.field ?? "rawDescription");
    setMatchType(rule?.matchType ?? "contains");
    setPattern(rule?.pattern ?? "");
    setCategoryId(rule?.categoryId ?? "overig");
    setPriority(rule?.priority ?? 50);
  }, [open, rule]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  async function save() {
    const d = { field, matchType, pattern: pattern.trim(), categoryId, priority };
    if (rule) await updateRule(rule.id, d);
    else await addRule(d);
    onClose();
  }
  async function remove() {
    if (!rule) return;
    if (confirm("Deze regel verwijderen?")) { await deleteRule(rule.id); onClose(); }
  }

  return createPortal(
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={rule ? "Regel bewerken" : "Nieuwe regel"}>
        <div className="sheet-grip" />
        <div className="sheet-h">
          <div style={{ minWidth: 0 }}>
            <div>{rule ? "Regel bewerken" : "Nieuwe regel"}</div>
            <div className="m-sheet-sub">Bij import automatisch categoriseren</div>
          </div>
          <button className="sheet-x" onClick={onClose} aria-label="Sluiten"><Ic name="x" size={18} /></button>
        </div>

        <div className="sheet-body scroll">
          <div className="m-field">
            <label className="m-bud-lbl">Veld</label>
            <div className="seg seg-full">
              <button type="button" className={field === "rawDescription" ? "on" : ""} onClick={() => setField("rawDescription")}>Omschrijving</button>
              <button type="button" className={field === "merchant" ? "on" : ""} onClick={() => setField("merchant")}>Naam</button>
            </div>
          </div>

          <div className="m-field">
            <label className="m-bud-lbl">Type match</label>
            <div className="seg seg-full">
              <button type="button" className={matchType === "contains" ? "on" : ""} onClick={() => setMatchType("contains")}>Bevat</button>
              <button type="button" className={matchType === "regex" ? "on" : ""} onClick={() => setMatchType("regex")}>Regex</button>
            </div>
          </div>

          <div className="m-field">
            <label className="m-bud-lbl" htmlFor="m-rule-pat">Patroon</label>
            <div className="m-bud-input">
              <input id="m-rule-pat" type="text" value={pattern} placeholder="bijv. ALBERT HEIJN" className="mono"
                onChange={(e) => setPattern(e.target.value)} style={{ fontSize: 15 }} />
            </div>
          </div>

          <div className="m-field">
            <label className="m-bud-lbl" htmlFor="m-rule-cat">Categorie</label>
            <div className="m-select">
              <select id="m-rule-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Categorie">
                {categoryGroups.map((g) => (
                  <optgroup key={g.id} label={g.name}>
                    {categories.filter((c) => c.groupId === g.id).sort(byName).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <Ic name="chevronDown" size={17} />
            </div>
          </div>

          <div className="m-field">
            <label className="m-bud-lbl">Prioriteit</label>
            <div className="m-stepper">
              <button type="button" aria-label="Lager" onClick={() => setPriority((p) => Math.max(0, p - 1))}>−</button>
              <span className="tnum">{priority}</span>
              <button type="button" aria-label="Hoger" onClick={() => setPriority((p) => p + 1)}><Ic name="plus" size={18} strokeWidth={2.2} /></button>
              <span className="m-stepper-hint">Lager = eerst toegepast</span>
            </div>
          </div>
        </div>

        <button type="button" className="btn btn-primary m-sheet-cta" onClick={save}>
          <Ic name="check" size={18} strokeWidth={2.3} /> Opslaan
        </button>
        {rule && (
          <button type="button" className="m-sheet-del" onClick={remove}>
            <Ic name="trash" size={15} /> Regel verwijderen
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
