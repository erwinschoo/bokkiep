import { useCallback, useEffect, useState } from "react";
import { STATUS_BAR } from "../theme/chrome";

export type Theme = "light" | "dark";
export type ThemePref = "system" | "light" | "dark";

const STORAGE_KEY = "bokkiep:theme";
const LEGACY_KEY = "financeapp:theme"; // voorkeur van vóór de rebrand
// Browser/PWA-chrome (statusbalk): één bron van waarheid in theme/chrome.ts —
// blauw in light mode, zwart in dark mode. De onderste navigatiebalk is altijd zwart
// (zie de `.safe-bottom`-scrim in app.css), los van deze theme-color.

function readStored(): ThemePref {
  try {
    const v = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (v === "dark" || v === "light" || v === "system") return v;
    return "system";
  } catch {
    return "system";
  }
}

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

/* Voorkeur → daadwerkelijk toegepast thema. "system" volgt het OS. */
function resolve(pref: ThemePref): Theme {
  if (pref === "system") return systemPrefersDark() ? "dark" : "light";
  return pref;
}

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") root.dataset.theme = "dark";
  else delete root.dataset.theme;
  // Het meta-element volledig vervangen (i.p.v. alleen content aanpassen) port Chrome
  // in een standalone PWA om de statusbalk-kleur opnieuw te lezen bij een thema-wissel;
  // in een gewone browsertab werkt het sowieso live.
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
  const meta = document.createElement("meta");
  meta.name = "theme-color";
  meta.content = STATUS_BAR[theme];
  document.head.appendChild(meta);
}

/* Beheert de thema-voorkeur (systeem/licht/donker): onthoudt in localStorage en zet
 * data-theme op <html>. CSS in app.css doet de rest globaal. Default = systeem: het
 * thema volgt prefers-color-scheme en wisselt live mee bij een OS-wissel, tenzij de
 * gebruiker expliciet licht of donker kiest. */
export function useTheme() {
  const [pref, setPrefState] = useState<ThemePref>(readStored);
  const [theme, setThemeState] = useState<Theme>(() => resolve(readStored()));

  // Houd het toegepaste thema + DOM-attribuut in sync met de voorkeur
  // (ook als het inline-script in index.html al iets zette).
  useEffect(() => {
    const t = resolve(pref);
    setThemeState(t);
    apply(t);
  }, [pref]);

  // Bij 'systeem': volg live wijzigingen van het OS-thema.
  useEffect(() => {
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const t: Theme = mq.matches ? "dark" : "light";
      setThemeState(t);
      apply(t);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  const setPref = useCallback((next: ThemePref) => {
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* genegeerd */ }
    setPrefState(next);
  }, []);

  // Backwards-compat: wissel tussen licht/donker als een expliciete voorkeur.
  const toggle = useCallback(() => {
    setPref(resolve(pref) === "dark" ? "light" : "dark");
  }, [pref, setPref]);

  return { theme, pref, setPref, toggle };
}
