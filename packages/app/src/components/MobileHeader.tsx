import type { ReactNode } from "react";
import { useKeepMeta } from "../db/keep";
import { useAutoSyncStatus } from "../sync/autoSync";
import { Ic } from "./Ic";
import { PeriodPicker } from "./PeriodPicker";
import { initialsFrom } from "../lib/initials";

/* Tijdgebonden begroeting (subtitel mobiel Overzicht). */
function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Goedenacht";
  if (h < 12) return "Goedemorgen";
  if (h < 18) return "Goedemiddag";
  return "Goedenavond";
}
function firstNameOf(name?: string): string {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

/* Mobiele per-scherm header: optionele subtitel + grote titel links, ronde avatar rechts
 * (opent de drawer met alle overige views). Zit zónder eigen achtergrond/rand op de
 * pagina-achtergrond — net als het ontwerp (geen topbalk). Op nog-niet-heringerichte
 * maand-schermen verschijnt de periode-kiezer eronder. Alleen gerenderd ≤860px (App.tsx). */
export function MobileHeader({
  title, sub, greet, showMonth, onMenu, actions,
}: {
  title: string;
  sub?: string;
  greet?: boolean;
  showMonth: boolean;
  onMenu: () => void;
  actions?: ReactNode;
}) {
  const acc = useKeepMeta<{ email?: string; name?: string }>("account");
  const photoMeta = useKeepMeta<{ dataUrl?: string }>("accountPhoto");
  const syncState = useAutoSyncStatus();
  const connected = !!acc?.email;
  const photo = connected ? photoMeta?.dataUrl : undefined;
  const locked = connected && syncState === "locked";

  // Tijdgebonden begroeting + voornaam (indien bekend), zoals het ontwerp.
  const subtitle = greet ? greeting() + (firstNameOf(acc?.name) ? `, ${firstNameOf(acc?.name)}` : "") : sub;

  return (
    <header className="m-header">
      <div className="m-header-row">
        <div className="m-header-titles">
          {subtitle && <div className="m-sub">{subtitle}</div>}
          <h1 className="m-title">{title}</h1>
        </div>
        {actions}
        <button type="button" className={"m-avatar" + (connected ? "" : " m-avatar-empty")} onClick={onMenu}
          aria-label={locked ? "Menu — vergrendeld" : "Menu openen"} title="Menu">
          {photo
            ? <img className="m-avatar-photo" src={photo} alt="" />
            : connected
              ? initialsFrom(acc?.name, acc?.email)
              : <Ic name="menu" size={20} />}
          {locked && <span className="m-avatar-lock"><Ic name="lock" size={11} /></span>}
        </button>
      </div>
      {showMonth && <div className="m-header-month"><PeriodPicker /></div>}
    </header>
  );
}
