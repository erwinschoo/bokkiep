import type { ReactNode } from "react";
import { useKeepMeta } from "../db/keep";
import { useAutoSyncStatus } from "../sync/autoSync";
import { Ic } from "./Ic";
import { PeriodPicker } from "./PeriodPicker";
import { initialsFrom } from "../lib/initials";

/* Mobiele per-scherm header: grote titel links, ronde avatar rechts (opent de drawer met
 * alle overige views). Op maand-schermen verschijnt de periode-kiezer eronder. Alleen
 * gerenderd op viewports ≤860px (zie App.tsx). */
export function MobileHeader({
  title, showMonth, onMenu, actions,
}: {
  title: string;
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

  return (
    <header className="m-header">
      <div className="m-header-row">
        <h1 className="m-title">{title}</h1>
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
