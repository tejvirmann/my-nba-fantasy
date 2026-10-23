"use client";

import { useState } from "react";
import { ActionForm, SubmitButton, type FormState } from "./ActionForm";

export type LockGame = {
  gameId: string;
  detail: string;
  stat: string;
  points: string;
  counted: boolean;
  lockable: boolean;
  action: (prev: FormState, form: FormData) => Promise<FormState>;
};

/** The "Lock" pill on a roster row; opens a sheet listing the player's finished games for the week. */
export function LockSheet({ player, games, note, auto = false }: { player: string; games: LockGame[]; note: string; auto?: boolean }) {
  const best = games.length ? games.reduce((a, b) => (Number(b.points) > Number(a.points) ? b : a)) : null;
  const [open, setOpen] = useState(false);
  return (
    <>
      {auto ? (
        <button type="button" className="tag acc" style={{ cursor: "pointer", border: 0 }} onClick={() => setOpen(true)}>Auto</button>
      ) : (
        <button type="button" className="pill solid sm" onClick={() => setOpen(true)}>Lock</button>
      )}
      {open ? (
        <div className="sheet-wrap" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label={`Lock a game for ${player}`}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grab" />
            <div style={{ fontSize: 18, fontWeight: 700 }}>{player}</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>{auto ? "Auto Lock-In is on. Lock a game yourself, or leave it to Auto." : "One game counts per week."} A lock can't be changed.</div>
            <div className="stack">
              {games.map((g) => (
                <div key={g.gameId} className={`opt ${g.counted ? "sel" : ""}`}>
                  <div>
                    <b style={{ fontSize: 14 }}>{g.detail}</b>
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>{g.stat}</div>
                  </div>
                  <div className="row" style={{ gap: 10 }}>
                    {best && g.gameId === best.gameId && games.length > 1 ? <span className="tag acc">Highest</span> : null}
                    <b style={{ fontSize: 20, fontWeight: 600 }}>{g.points}</b>
                    {g.lockable ? (
                      <ActionForm action={g.action} inline>
                        <SubmitButton className="pill solid sm" pendingText="…">Lock</SubmitButton>
                      </ActionForm>
                    ) : (
                      <span className="tag">{g.counted ? "Counts now" : "Unavailable"}</span>
                    )}
                  </div>
                </div>
              ))}
              {games.length === 0 ? <div className="opt">No finished games yet.</div> : null}
              <div className="banner" style={{ fontSize: 13 }}>{note}</div>
              <button type="button" className="pill block" onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
