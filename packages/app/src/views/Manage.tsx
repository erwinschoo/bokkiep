import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../state/AppContext";
import {
  addCategory, updateCategory, deleteCategory,
  addCategoryGroup, updateCategoryGroup, deleteCategoryGroup, setCategoryGroup,
  addRule, updateRule, deleteRule,
} from "../db/repo";
import { Ic } from "../components/Ic";
import { Button } from "../components/Button";
import { Tooltip } from "../components/Tooltip";
import { Dropdown } from "../components/Dropdown";
import { ColorPicker } from "../components/ColorPicker";
import { CatEditSheet } from "../components/CatEditSheet";
import { RuleEditSheet } from "../components/RuleEditSheet";
import { CAT_COLORS as COLORS, TYPE_LABEL, FIELD_LABEL, MATCH_LABEL } from "../lib/catMeta";
import { useMediaQuery } from "../charts/useMediaQuery";
import { catTint } from "../lib/catColor";
import { usePointerDragMove } from "../charts/usePointerDragMove";
import type { Category, CategoryGroupRow, CategoryType, RuleRow } from "../db/types";

const byName = (a: Category, b: Category) => a.name.localeCompare(b.name, "nl");

export function Manage() {
  const isMobile = useMediaQuery("(max-width: 860px)");
  const [tab, setTab] = useState<"cats" | "rules">("cats");

  if (isMobile) {
    return (
      <div className="content-inner fade-in">
        <div className="seg seg-full" style={{ marginBottom: 14 }}>
          <button className={tab === "cats" ? "on" : ""} onClick={() => setTab("cats")}>Categorieën</button>
          <button className={tab === "rules" ? "on" : ""} onClick={() => setTab("rules")}>Regels</button>
        </div>
        {tab === "cats" ? <MobileCategories /> : <MobileRules />}
      </div>
    );
  }

  return (
    <div className="content-inner fade-in" style={{ maxWidth: 920 }}>
      <div className="seg" style={{ marginBottom: 18 }}>
        <button className={tab === "cats" ? "on" : ""} onClick={() => setTab("cats")}>Categorieën</button>
        <button className={tab === "rules" ? "on" : ""} onClick={() => setTab("rules")}>Regels</button>
      </div>
      {tab === "cats" ? <CategoriesTab /> : <RulesTab />}
    </div>
  );
}

/* ── Categorieën ── */
function CategoriesTab() {
  const { categories, categoryGroups, transactions } = useApp();
  const [editId, setEditId] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);     // groupId waar we een categorie aan toevoegen
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  // verslepen naar een andere groep — pointer-based (werkt op touch + muis, met auto-scroll)
  const { dragCat, dropGroup, startDrag } = usePointerDragMove({ onMove: setCategoryGroup });

  const usage = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of transactions) if (t.category) m[t.category] = (m[t.category] || 0) + 1;
    return m;
  }, [transactions]);

  const inGroup = (id: string) => categories.filter((c) => c.groupId === id).sort(byName);

  return (
    <div className="card card-pad">
      <div className="card-h" style={{ marginBottom: 14 }}>
        <h3>Categorieën</h3>
        <Button style={{ marginLeft: "auto" }} icon="plus" onClick={() => addCategoryGroup({ name: "Nieuwe groep" })}>
          Nieuwe groep
        </Button>
        <Button variant="primary" icon="plus" onClick={() => { setAdding(categoryGroups[0]?.id ?? null); setEditId(null); }}>
          Nieuwe categorie
        </Button>
      </div>

      {adding && categoryGroups.length > 0 && (
        <CatEditor groups={categoryGroups} defaultGroupId={adding}
          onCancel={() => setAdding(null)} onSave={async (d) => { await addCategory(d); setAdding(null); }} />
      )}

      {categoryGroups.length === 0 && <div className="empty">Nog geen categoriegroepen.</div>}

      {categoryGroups.map((g) => {
        const members = inGroup(g.id);
        const isOver = dropGroup === g.id;
        return (
          <div key={g.id} data-group-id={g.id} className={"cat-group-sec" + (isOver ? " drag-over" : "")}>
            {editGroupId === g.id ? (
              <GroupEditor group={g} onCancel={() => setEditGroupId(null)}
                onSave={async (d) => { await updateCategoryGroup(g.id, d); setEditGroupId(null); }} />
            ) : (
              <div className="cat-group-h">
                <div style={{ fontWeight: 800, color: "var(--ink)", fontSize: 14.5 }}>{g.name}</div>
                <span style={{ fontSize: 12, color: "var(--faint)" }}>{members.length}</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
                  <Tooltip label="Categorie toevoegen aan groep" side="bottom">
                    <Button variant="ghost" iconOnly icon="plus" aria-label="Categorie toevoegen aan groep"
                      onClick={() => { setAdding(g.id); setEditId(null); }} />
                  </Tooltip>
                  <Tooltip label="Groep bewerken" side="bottom">
                    <Button variant="ghost" iconOnly icon="edit" aria-label="Groep bewerken"
                      onClick={() => setEditGroupId(g.id)} />
                  </Tooltip>
                  <Tooltip label="Groep verwijderen" side="bottom">
                    <Button variant="ghost" iconOnly icon="trash" aria-label="Groep verwijderen"
                      onClick={() => removeGroup(g, members, categoryGroups)} />
                  </Tooltip>
                </div>
              </div>
            )}

            {members.length === 0 && (
              <div className="cat-empty-drop">Sleep hier categorieën naartoe of voeg er een toe.</div>
            )}
            {members.map((c) => (
              <CatRow key={c.id} c={c} groups={categoryGroups}
                usage={usage[c.id] || 0} editing={editId === c.id}
                isDragging={dragCat === c.id}
                onEdit={() => { setEditId(c.id); setAdding(null); }} onClose={() => setEditId(null)}
                onGripPointerDown={startDrag} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

async function removeGroup(g: CategoryGroupRow, members: Category[], groups: CategoryGroupRow[]) {
  const others = groups.filter((x) => x.id !== g.id);
  if (others.length === 0) { alert("Er moet minstens één categoriegroep overblijven."); return; }
  const target = others[0];
  const msg = members.length === 0
    ? `Groep "${g.name}" verwijderen?`
    : `${members.length} categorie(ën) verhuizen naar "${target.name}" en groep "${g.name}" verwijderen?`;
  if (confirm(msg)) await deleteCategoryGroup(g.id, target.id);
}

function CatRow({
  c, groups, usage, editing, isDragging,
  onEdit, onClose, onGripPointerDown,
}: {
  c: Category; groups: CategoryGroupRow[]; usage: number;
  editing: boolean; isDragging: boolean;
  onEdit: () => void; onClose: () => void;
  onGripPointerDown: (catId: string, e: React.PointerEvent) => void;
}) {
  async function remove() {
    const msg = usage > 0 ? `${usage} transactie(s) worden verplaatst naar "Overig". Doorgaan?` : `Categorie "${c.name}" verwijderen?`;
    if (confirm(msg)) await deleteCategory(c.id);
  }
  return (
    <div style={{ borderBottom: "1px solid var(--line-soft)" }}>
      <div className={"cat-row" + (isDragging ? " dragging" : "")}>
        <span className="cat-grip" title="Sleep naar een andere groep" onPointerDown={(e) => onGripPointerDown(c.id, e)}><Ic name="grip" size={16} /></span>
        <div className="cat-main">
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: c.color, flex: "none" }}></span>
          <div className="cat-name" style={{ fontWeight: 400, color: "var(--ink)", fontSize: 14 }}>{c.name}</div>
          <span className="tag" style={{ background: "var(--subtle)", color: "var(--muted)", fontSize: 11 }}>{TYPE_LABEL[c.type]}</span>
        </div>
        <span style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--muted)" }} className="tnum">{usage} transacties</span>
        <div className="cat-actions">
          <Tooltip label="Bewerken">
            <Button variant="ghost" iconOnly icon="edit" onClick={onEdit} aria-label="Bewerken" />
          </Tooltip>
          <Tooltip label="Verwijderen">
            <Button variant="ghost" iconOnly icon="trash" onClick={remove} aria-label="Verwijderen" />
          </Tooltip>
        </div>
      </div>
      {editing && <CatEditor initial={c} groups={groups} onCancel={onClose} onSave={async (d) => { await updateCategory(c.id, d); onClose(); }} />}
    </div>
  );
}

function CatEditor({ initial, groups, defaultGroupId, onSave, onCancel }: {
  initial?: Category; groups: CategoryGroupRow[]; defaultGroupId?: string;
  onSave: (d: { name: string; color: string; type: CategoryType; groupId: string }) => void; onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? COLORS[0]);
  const [type, setType] = useState<CategoryType>(initial?.type ?? "uitgave");
  const [groupId, setGroupId] = useState(initial?.groupId ?? defaultGroupId ?? groups[0]?.id ?? "");
  return (
    <div className="editor-grid" style={{ background: "var(--subtle)", borderRadius: 12, padding: 16, margin: "4px 0 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Naam</label>
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus
          style={{ display: "block", width: "100%", marginTop: 6, border: "1px solid var(--line)", borderRadius: 10, padding: "9px 12px", fontSize: 14, outline: "none" }} />
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Type</label>
        <div style={{ marginTop: 6 }}>
          <Dropdown fullWidth ariaLabel="Type" value={type} onChange={(v) => setType(v as CategoryType)}
            options={(["uitgave", "inkomen", "sparen", "overboeking"] as CategoryType[]).map((t) => ({ value: t, label: TYPE_LABEL[t] }))} />
        </div>
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Groep</label>
        <div style={{ marginTop: 6 }}>
          <Dropdown fullWidth ariaLabel="Groep" value={groupId} onChange={setGroupId}
            options={groups.map((g) => ({ value: g.id, label: g.name }))} />
        </div>
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Kleur</label>
        <ColorPicker color={color} onChange={setColor} />
      </div>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Button onClick={onCancel}>Annuleren</Button>
        <Button variant="primary" icon="check" onClick={() => onSave({ name, color, type, groupId })}>Opslaan</Button>
      </div>
    </div>
  );
}

function GroupEditor({ group, onSave, onCancel }: {
  group: CategoryGroupRow; onSave: (d: { name: string }) => void; onCancel: () => void;
}) {
  const [name, setName] = useState(group.name);
  return (
    <div className="editor-grid" style={{ background: "var(--subtle)", borderRadius: 12, padding: 16, margin: "4px 0 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Groepsnaam</label>
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus
          style={{ display: "block", width: "100%", marginTop: 6, border: "1px solid var(--line)", borderRadius: 10, padding: "9px 12px", fontSize: 14, outline: "none" }} />
      </div>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Button onClick={onCancel}>Annuleren</Button>
        <Button variant="primary" icon="check" onClick={() => onSave({ name })}>Opslaan</Button>
      </div>
    </div>
  );
}

/* ── Regels ── */
type SortCol = "field" | "matchType" | "pattern" | "categoryId" | "priority";

function RulesTab() {
  const { rules, categories, categoryGroups, catMap } = useApp();
  // Klikbare kolomkoppen: eerste klik = A-Z (oplopend), nogmaals = Z-A. Standaard op prioriteit.
  const [sort, setSort] = useState<{ col: SortCol; dir: "asc" | "desc" }>({ col: "priority", dir: "asc" });

  const sortVal = (r: RuleRow): string | number => {
    switch (sort.col) {
      case "field": return FIELD_LABEL[r.field] ?? r.field;
      case "matchType": return MATCH_LABEL[r.matchType] ?? r.matchType;
      case "pattern": return r.pattern ?? "";
      case "categoryId": return catMap[r.categoryId]?.name ?? "";
      case "priority": return r.priority;
    }
  };
  const sorted = [...rules].sort((a, b) => {
    const va = sortVal(a), vb = sortVal(b);
    const cmp = typeof va === "number" && typeof vb === "number"
      ? va - vb
      : String(va).localeCompare(String(vb), "nl");
    return sort.dir === "asc" ? cmp : -cmp;
  });

  const Th = ({ col, label, style }: { col: SortCol; label: string; style?: React.CSSProperties }) => {
    const active = sort.col === col;
    return (
      <th style={{ ...style, cursor: "pointer", userSelect: "none" }}
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
        onClick={() => setSort((p) => (p.col === col ? { col, dir: p.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" }))}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: active ? "var(--ink)" : undefined, fontWeight: active ? 800 : undefined }}>
          {label}
          <span style={{ fontSize: 10, lineHeight: 1, opacity: active ? 0.9 : 0.25 }}>{active && sort.dir === "desc" ? "▼" : "▲"}</span>
        </span>
      </th>
    );
  };

  // categorie-opties (gegroepeerd per categoriegroep) voor de gestylede Dropdown
  const catDropdownOptions = () =>
    categoryGroups.flatMap((g) =>
      categories.filter((c) => c.groupId === g.id).sort(byName)
        .map((c) => ({ value: c.id, label: c.name, color: c.color, group: g.name })),
    );

  const sel = { border: "1px solid var(--line)", borderRadius: 8, padding: "6px 8px", fontSize: 13, background: "var(--surface)" } as const;

  return (
    <div className="card card-pad">
      <div className="card-h" style={{ marginBottom: 6 }}>
        <h3>Categoriseer-regels</h3>
        <Button variant="primary" style={{ marginLeft: "auto" }} icon="plus"
          onClick={() => addRule({ field: "rawDescription", pattern: "", matchType: "contains", categoryId: "overig", priority: 50 })}>
          Nieuwe regel
        </Button>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 0 }}>
        Regels vullen automatisch een categorie in bij import. Een toewijzing per tegenpartij wint altijd van een regel. Lagere prioriteit = eerst toegepast.
      </p>
      <div className="tbl-wrap">
      <table className="tbl">
        <thead><tr>
          <Th col="field" label="Veld" style={{ paddingLeft: 0 }} />
          <Th col="matchType" label="Type" />
          <Th col="pattern" label="Patroon (tekst)" />
          <Th col="categoryId" label="Categorie" />
          <Th col="priority" label="Prio" style={{ width: 70 }} />
          <th></th>
        </tr></thead>
        <tbody>
          {sorted.length === 0 && <tr><td colSpan={6}><div className="empty">Nog geen regels.</div></td></tr>}
          {sorted.map((r: RuleRow) => (
            <tr key={r.id}>
              <td style={{ paddingLeft: 0 }}>
                <Dropdown fullWidth ariaLabel="Veld" value={r.field}
                  onChange={(v) => updateRule(r.id, { field: v as RuleRow["field"] })}
                  options={[{ value: "rawDescription", label: "Omschrijving" }, { value: "merchant", label: "Naam (merchant)" }]} />
              </td>
              <td>
                <Dropdown fullWidth ariaLabel="Type" value={r.matchType}
                  onChange={(v) => updateRule(r.id, { matchType: v as RuleRow["matchType"] })}
                  options={[{ value: "contains", label: "bevat" }, { value: "regex", label: "regex" }]} />
              </td>
              <td>
                <input defaultValue={r.pattern} onBlur={(e) => updateRule(r.id, { pattern: e.target.value })} placeholder="bijv. ALBERT HEIJN"
                  style={{ ...sel, width: "100%", minWidth: 160 }} />
              </td>
              <td>
                <Dropdown fullWidth ariaLabel="Categorie" value={r.categoryId} minWidth={210}
                  onChange={(v) => updateRule(r.id, { categoryId: v })}
                  options={catDropdownOptions()} />
              </td>
              <td>
                <input type="number" defaultValue={r.priority} onBlur={(e) => updateRule(r.id, { priority: Number(e.target.value) || 50 })}
                  className="tnum" style={{ ...sel, width: 60 }} />
              </td>
              <td style={{ textAlign: "right" }}>
                <Tooltip label="Verwijderen" side="left">
                  <Button variant="ghost" iconOnly icon="trash" aria-label="Verwijderen" onClick={() => deleteRule(r.id)} />
                </Tooltip>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

/* ══════════════════ Mobiel ══════════════════ */

/* Categorieën-tab (mobiel): groepen als secties met kaart-rijen. Verplaatsen tussen groepen
 * kan via slepen aan de grip (usePointerDragMove, touch-geschikt) én via het Groep-veld in de
 * bewerk-sheet. Toevoegen/bewerken via bottom-sheets. */
function MobileCategories() {
  const { categories, categoryGroups, transactions } = useApp();
  const { dragCat, dropGroup, startDrag } = usePointerDragMove({ onMove: setCategoryGroup });
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [addGroupId, setAddGroupId] = useState<string | null>(null);
  const [groupSheet, setGroupSheet] = useState<CategoryGroupRow | null>(null);

  const usage = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of transactions) if (t.category) m[t.category] = (m[t.category] || 0) + 1;
    return m;
  }, [transactions]);

  const inGroup = (id: string) => categories.filter((c) => c.groupId === id).sort(byName);

  return (
    <>
      {categoryGroups.length === 0 && <div className="card card-pad"><div className="empty">Nog geen categoriegroepen.</div></div>}

      {categoryGroups.map((g) => {
        const members = inGroup(g.id);
        return (
          <div key={g.id} data-group-id={g.id} className={"m-cat-group" + (dropGroup === g.id ? " drag-over" : "")}>
            <div className="m-cat-group-h">
              <span className="m-cat-group-name">{g.name}</span>
              <span className="m-cat-group-count">{members.length}</span>
              <button type="button" className="m-cat-gbtn blue" aria-label="Categorie toevoegen"
                onClick={() => setAddGroupId(g.id)}><Ic name="plus" size={15} /></button>
              <button type="button" className="m-cat-gbtn" aria-label="Groep bewerken"
                onClick={() => setGroupSheet(g)}><Ic name="edit" size={14} /></button>
            </div>
            <div className="card m-cat-card">
              {members.length === 0 && <div className="m-cat-empty">Sleep hier categorieën naartoe of voeg er een toe.</div>}
              {members.map((c) => (
                <div key={c.id} className={"m-cat-row" + (dragCat === c.id ? " dragging" : "")}>
                  <span className="m-cat-grip" title="Sleep naar een andere groep" onPointerDown={(e) => startDrag(c.id, e)}><Ic name="grip" size={17} /></span>
                  <button type="button" className="m-cat-rowbtn" onClick={() => setEditCat(c)}>
                    <span className="m-cat-dot" style={{ background: c.color }} />
                    <span className="m-cat-name">{c.name}</span>
                    <span className="m-cat-type">{TYPE_LABEL[c.type]}</span>
                    <span className="m-cat-count tnum">{usage[c.id] || 0}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <button type="button" className="m-add-dash" onClick={() => addCategoryGroup({ name: "Nieuwe groep" })}>
        <Ic name="plus" size={17} strokeWidth={2.2} /> Nieuwe groep
      </button>

      <CatEditSheet open={!!editCat} cat={editCat} groups={categoryGroups} usage={editCat ? (usage[editCat.id] || 0) : 0} onClose={() => setEditCat(null)} />
      <CatEditSheet open={!!addGroupId} cat={null} groups={categoryGroups} defaultGroupId={addGroupId ?? undefined} onClose={() => setAddGroupId(null)} />
      <MobileGroupSheet group={groupSheet} groups={categoryGroups} members={groupSheet ? inGroup(groupSheet.id) : []} onClose={() => setGroupSheet(null)} />
    </>
  );
}

/* Groep bewerken (mobiel): naam wijzigen of de groep verwijderen (categorieën verhuizen
 * naar een andere groep). */
function MobileGroupSheet({ group, groups, members, onClose }: {
  group: CategoryGroupRow | null; groups: CategoryGroupRow[]; members: Category[]; onClose: () => void;
}) {
  const [name, setName] = useState("");
  useEffect(() => { if (group) setName(group.name); }, [group]);
  useEffect(() => {
    if (!group) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [group, onClose]);
  if (!group) return null;

  async function save() { if (group) await updateCategoryGroup(group.id, { name: name.trim() || group.name }); onClose(); }
  async function remove() { if (group) { await removeGroup(group, members, groups); onClose(); } }

  return createPortal(
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Groep bewerken">
        <div className="sheet-grip" />
        <div className="sheet-h"><span>Groep bewerken</span>
          <button className="sheet-x" onClick={onClose} aria-label="Sluiten"><Ic name="x" size={18} /></button>
        </div>
        <div className="m-field">
          <label className="m-bud-lbl" htmlFor="m-grp-name">Naam</label>
          <div className="m-bud-input"><input id="m-grp-name" type="text" value={name} autoFocus
            onChange={(e) => setName(e.target.value)} style={{ fontSize: 16 }} /></div>
        </div>
        <button type="button" className="btn btn-primary m-sheet-cta" onClick={save}>
          <Ic name="check" size={18} strokeWidth={2.3} /> Opslaan
        </button>
        <button type="button" className="m-sheet-del" onClick={remove}>
          <Ic name="trash" size={15} /> Groep verwijderen
        </button>
      </div>
    </div>,
    document.body,
  );
}

/* Regels-tab (mobiel): kaart-rijen met prioriteit-badge, patroon en "veld match → categorie".
 * Bewerken/toevoegen via een bottom-sheet. */
function MobileRules() {
  const { rules, catMap } = useApp();
  const [editRule, setEditRule] = useState<RuleRow | null>(null);
  const [adding, setAdding] = useState(false);

  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  return (
    <>
      <div className="m-info-banner standalone">
        <Ic name="info" size={16} />
        <div>Een toewijzing per tegenpartij wint altijd van een regel. Lagere prioriteit wordt het eerst toegepast.</div>
      </div>

      <div className="card m-rule-card">
        {sorted.length === 0 && <div className="m-cat-empty">Nog geen regels.</div>}
        {sorted.map((r) => {
          const c = catMap[r.categoryId];
          return (
            <button key={r.id} type="button" className="m-rule-row" onClick={() => setEditRule(r)}>
              <span className="m-rule-prio tnum">{r.priority}</span>
              <span className="m-rule-main">
                <span className="m-rule-pat mono">«{r.pattern || "—"}»</span>
                <span className="m-rule-sub">
                  {FIELD_LABEL[r.field]} {MATCH_LABEL[r.matchType]}
                  <span className="m-rule-arrow">→</span>
                  <span className="m-rule-cat" style={{ background: c ? catTint(c.color) : "var(--subtle)", color: c ? c.color : "var(--muted)" }}>
                    <span className="m-rule-catdot" style={{ background: c ? c.color : "var(--muted)" }} />{c ? c.name : "Overig"}
                  </span>
                </span>
              </span>
              <span className="m-rule-edit"><Ic name="edit" size={15} /></span>
            </button>
          );
        })}
      </div>

      <button type="button" className="m-add-dash" onClick={() => setAdding(true)}>
        <Ic name="plus" size={17} strokeWidth={2.2} /> Nieuwe regel
      </button>

      <RuleEditSheet open={!!editRule} rule={editRule} onClose={() => setEditRule(null)} />
      <RuleEditSheet open={adding} rule={null} onClose={() => setAdding(false)} />
    </>
  );
}
