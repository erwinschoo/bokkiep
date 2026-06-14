import { useApp, type ViewId } from "../state/AppContext";
import { Ic } from "./Ic";

interface Tab { id: ViewId; icon: string; label: string }

// Vier tabs rond de verhoogde center-FAB (Importeren): twee links, twee rechts.
const TABS: Tab[] = [
  { id: "dashboard", icon: "dashboard", label: "Overzicht" },
  { id: "transacties", icon: "list", label: "Transacties" },
  { id: "budgetten", icon: "sliders", label: "Budget" },
  { id: "spaardoel", icon: "target", label: "Sparen" },
];

/* Mobiele bottom-tab bar. Vier hoofdschermen + center-FAB die de import-view opent.
 * Alleen gerenderd op viewports ≤860px (zie App.tsx). Kleuren via CSS-vars → werkt
 * automatisch mee met light/dark. */
export function MobileTabBar() {
  const { view, setView, uncategorizedCount } = useApp();

  const tab = (t: Tab) => {
    const on = view === t.id;
    return (
      <button key={t.id} className={"mtab-item" + (on ? " active" : "")} onClick={() => setView(t.id)}
        aria-label={t.label} aria-current={on ? "page" : undefined}>
        <span className="mtab-ic">
          <Ic name={t.icon} size={22} strokeWidth={on ? 2.2 : 1.9} />
          {t.id === "transacties" && uncategorizedCount ? <span className="mtab-badge">{uncategorizedCount}</span> : null}
        </span>
        <span className="mtab-label">{t.label}</span>
      </button>
    );
  };

  return (
    <nav className="mtab" aria-label="Hoofdnavigatie">
      <div className="mtab-row">
        {TABS.slice(0, 2).map(tab)}
        <button className="mtab-fab" onClick={() => setView("import")} aria-label="Importeren">
          <Ic name="upload" size={24} strokeWidth={2.1} />
        </button>
        {TABS.slice(2).map(tab)}
      </div>
    </nav>
  );
}
