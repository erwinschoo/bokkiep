import { CAT_COLORS } from "../lib/catMeta";

/* Palet-kiezer (gedeeld door de desktop categorie-/groep-editor en de mobiele sheets).
 * Toont de huisstijl-suggesties plus een veld om een eigen kleur te kiezen. */
export function ColorPicker({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const isCustom = !CAT_COLORS.includes(color);
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
      {CAT_COLORS.map((col) => (
        <button key={col} type="button" onClick={() => onChange(col)} title={col}
          style={{ width: 26, height: 26, borderRadius: "50%", background: col, border: color === col ? "2px solid var(--ink)" : "2px solid var(--surface)", boxShadow: "0 0 0 1px var(--line)", cursor: "pointer" }} />
      ))}
      <label title="Eigen kleur kiezen" style={{
        position: "relative", width: 26, height: 26, borderRadius: "50%", cursor: "pointer", display: "inline-flex",
        background: isCustom ? color : "conic-gradient(from 0deg, #e15b4c, #e0a23a, #4e8c7a, #5e81b5, #9a86be, #e15b4c)",
        border: isCustom ? "2px solid var(--ink)" : "2px solid var(--surface)", boxShadow: "0 0 0 1px var(--line)",
      }}>
        <input type="color" value={isCustom ? color : "#5E81B5"} onChange={(e) => onChange(e.target.value)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", border: 0, padding: 0 }} />
      </label>
    </div>
  );
}
