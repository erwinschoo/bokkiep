import { useRef, useState, type ReactNode } from "react";
import { Ic } from "./Ic";

const ACTION_W = 92;       // breedte van het onthulde actiepaneel
const THRESHOLD = 6;       // px voordat een beweging als swipe/tik telt

/* Rij die naar links veegt om één actie te onthullen ("Indelen"). Pointer-gebaseerd,
 * dus werkt op touch én muis. Verticaal scrollen blijft mogelijk (touch-action:pan-y +
 * richting-detectie). Een tik op de rij (zonder te vegen) roept dezelfde actie aan. */
export function SwipeRow({ actionLabel, actionIcon = "check", onAction, children }: {
  actionLabel: string;
  actionIcon?: string;
  onAction: () => void;
  children: ReactNode;
}) {
  const [x, setX] = useState(0);
  const drag = useRef<{ id: number; sx: number; sy: number; startX: number; active: boolean; moved: boolean } | null>(null);

  function down(e: React.PointerEvent) {
    if (e.button != null && e.button !== 0) return;
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, startX: x, active: false, moved: false };
  }
  function move(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.active) {
      if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return;
      if (Math.abs(dy) > Math.abs(dx)) { drag.current = null; return; } // verticaal → laat scrollen
      d.active = true;
      (e.currentTarget as HTMLElement).setPointerCapture(d.id);
    }
    d.moved = true;
    setX(Math.max(-ACTION_W, Math.min(0, d.startX + dx)));
  }
  function up(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    if (d.active) setX(x < -ACTION_W / 2 ? -ACTION_W : 0);
    drag.current = null;
  }
  function onClick() {
    if (drag.current?.moved) return;     // einde van een veeg, geen tik
    setX(0);
    onAction();
  }

  return (
    <div className="swipe-row">
      <button className="swipe-action" type="button" style={{ width: ACTION_W }}
        tabIndex={x <= -ACTION_W / 2 ? 0 : -1}
        onClick={() => { setX(0); onAction(); }}>
        <Ic name={actionIcon} size={20} strokeWidth={2.2} />
        <span>{actionLabel}</span>
      </button>
      <div className="swipe-face" role="button" tabIndex={0}
        style={{ transform: `translateX(${x}px)`, transition: drag.current ? "none" : "transform .2s var(--ease)" }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onClick={onClick} onKeyDown={(e) => { if (e.key === "Enter") onAction(); }}>
        {children}
      </div>
    </div>
  );
}
