import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { addCategory, updateCategory, deleteCategory } from "../db/repo";
import { CAT_COLORS, TYPE_LABEL, TYPE_ORDER } from "../lib/catMeta";
import type { Category, CategoryGroupRow, CategoryType } from "../db/types";
import { ColorPicker } from "./ColorPicker";
import { Ic } from "./Ic";

/* Bottom-sheet om een categorie toe te voegen of te bewerken (mobiel): naam, type, groep
 * en kleur. De groep-select is — naast slepen aan de grip — de tweede manier om een
 * categorie naar een andere groep te verplaatsen. */
export function CatEditSheet({ open, cat, groups, defaultGroupId, usage, onClose }: {
  open: boolean;
  cat: Category | null;                 // null = nieuwe categorie
  groups: CategoryGroupRow[];
  defaultGroupId?: string;
  usage?: number;                       // aantal transacties (alleen bij bewerken)
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(CAT_COLORS[0]);
  const [type, setType] = useState<CategoryType>("uitgave");
  const [groupId, setGroupId] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(cat?.name ?? "");
    setColor(cat?.color ?? CAT_COLORS[0]);
    setType(cat?.type ?? "uitgave");
    setGroupId(cat?.groupId ?? defaultGroupId ?? groups[0]?.id ?? "");
  }, [open, cat, defaultGroupId, groups]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  async function save() {
    const nm = name.trim() || "Naamloos";
    if (cat) await updateCategory(cat.id, { name: nm, color, type, groupId });
    else await addCategory({ name: nm, color, type, groupId });
    onClose();
  }
  async function remove() {
    if (!cat) return;
    const msg = usage ? `${usage} transactie(s) worden verplaatst naar "Overig". Doorgaan?` : `Categorie "${cat.name}" verwijderen?`;
    if (confirm(msg)) { await deleteCategory(cat.id); onClose(); }
  }

  return createPortal(
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={cat ? "Categorie bewerken" : "Nieuwe categorie"}>
        <div className="sheet-grip" />
        <div className="sheet-h">
          <div style={{ minWidth: 0 }}>
            <div>{cat ? "Categorie bewerken" : "Nieuwe categorie"}</div>
            {cat && usage != null && <div className="m-sheet-sub">{cat.name} · {usage} transactie{usage === 1 ? "" : "s"}</div>}
          </div>
          <button className="sheet-x" onClick={onClose} aria-label="Sluiten"><Ic name="x" size={18} /></button>
        </div>

        <div className="sheet-body scroll">
          <div className="m-field">
            <label className="m-bud-lbl" htmlFor="m-cat-name">Naam</label>
            <div className="m-bud-input">
              <input id="m-cat-name" type="text" value={name} placeholder="Naam" autoFocus
                onChange={(e) => setName(e.target.value)} style={{ fontSize: 16 }} />
            </div>
          </div>

          <div className="m-field">
            <label className="m-bud-lbl">Type</label>
            <div className="seg seg-full">
              {TYPE_ORDER.map((t) => (
                <button key={t} type="button" className={type === t ? "on" : ""} onClick={() => setType(t)}>{TYPE_LABEL[t]}</button>
              ))}
            </div>
          </div>

          <div className="m-field">
            <label className="m-bud-lbl" htmlFor="m-cat-group">Groep</label>
            <div className="m-select">
              <select id="m-cat-group" value={groupId} onChange={(e) => setGroupId(e.target.value)} aria-label="Groep">
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <Ic name="chevronDown" size={17} />
            </div>
          </div>

          <div className="m-field">
            <label className="m-bud-lbl">Kleur</label>
            <ColorPicker color={color} onChange={setColor} />
          </div>
        </div>

        <button type="button" className="btn btn-primary m-sheet-cta" onClick={save}>
          <Ic name="check" size={18} strokeWidth={2.3} /> Opslaan
        </button>
        {cat && (
          <button type="button" className="m-sheet-del" onClick={remove}>
            <Ic name="trash" size={15} /> Categorie verwijderen
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
