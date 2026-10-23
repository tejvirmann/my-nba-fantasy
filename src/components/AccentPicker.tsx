"use client";

import { useState } from "react";
import { ActionForm, SubmitButton, type FormState } from "./ActionForm";
import { accentVars, DEFAULT_ACCENT, parseHex, SWATCHES } from "@/core/color";

/** Swatches plus a custom color. Previews instantly on the whole page; Save stores it on the account. */
export function AccentPicker({ initial, action }: { initial: string; action: (prev: FormState, form: FormData) => Promise<FormState> }) {
  const [hex, setHex] = useState(parseHex(initial) ?? DEFAULT_ACCENT);

  function preview(next: string) {
    const v = parseHex(next);
    if (!v) return;
    setHex(v);
    const vars = accentVars(v) as Record<string, string>;
    for (const [k, val] of Object.entries(vars)) document.documentElement.style.setProperty(k, val);
  }

  return (
    <ActionForm action={action} className="stack">
      <input type="hidden" name="accent" value={hex} />
      <div className="swatches">
        {SWATCHES.map((s) => (
          <button
            key={s.hex}
            type="button"
            className={`sw ${hex === s.hex ? "on" : ""}`}
            style={{ background: s.hex }}
            aria-label={s.name}
            aria-pressed={hex === s.hex}
            title={s.name}
            onClick={() => preview(s.hex)}
          />
        ))}
      </div>
      <label className="row" style={{ gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Custom</span>
        <input type="color" value={hex} onChange={(e) => preview(e.target.value)} style={{ width: 56, height: 36, border: "1px solid #c9cdd3", borderRadius: 6, background: "#fff" }} aria-label="Custom accent color" />
        <code style={{ fontSize: 13, color: "var(--muted)" }}>{hex}</code>
      </label>
      <div className="row">
        <SubmitButton className="btn btn-primary">Save color</SubmitButton>
        <button type="button" className="btn" onClick={() => preview(DEFAULT_ACCENT)}>Reset to green</button>
      </div>
    </ActionForm>
  );
}
