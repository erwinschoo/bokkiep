import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../state/AppContext";
import { Ic } from "./Ic";
import type { Category } from "../db/types";

const byName = (a: Category, b: Category) => a.name.localeCompare(b.name, "nl");

/* Bottom-sheet om een categorie te kiezen (mobiel). Hergebruikt de .cat-opt/.cat-group
 * stijl van het categorie-menu. Sluit via de scrim, de X of Escape. */
export function CategorySheet({ open, title, current, onPick, onClose }: {
  open: boolean;
  title: string;
  current?: string;
  onPick: (catId: string) => void;
  onClose: () => void;
}) {
  const { categories, categoryGroups } = useApp();

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="sheet-grip" />
        <div className="sheet-h">
          <span>{title}</span>
          <button className="sheet-x" onClick={onClose} aria-label="Sluiten"><Ic name="x" size={18} /></button>
        </div>
        <div className="sheet-body scroll">
          {categoryGroups.map((g) => {
            const members = categories.filter((c) => c.groupId === g.id && c.id !== "inkomen").sort(byName);
            if (members.length === 0) return null;
            return (
              <div key={g.id}>
                <div className="cat-group">{g.name}</div>
                {members.map((c) => (
                  <button key={c.id} className={"cat-opt" + (current === c.id ? " sel" : "")} onClick={() => onPick(c.id)}>
                    <span className="dot" style={{ background: c.color }} />
                    {c.name}
                    {current === c.id && <span className="ck"><Ic name="check" size={15} /></span>}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
