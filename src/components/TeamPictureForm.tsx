"use client";

import { useRef, useState } from "react";
import { ActionForm, SubmitButton, type FormState } from "./ActionForm";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

const SIZE = 256;

/** Crops to a centered square and shrinks to a 256px JPEG, so uploads stay tiny and every format works. */
async function toSquareJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  return canvas.toDataURL("image/jpeg", 0.85);
}

/** Pick a photo, see it, save it. Only the team's own manager sees this form. */
export function TeamPictureForm({ saveAction, removeAction, currentSrc, initials }: { saveAction: Action; removeAction: Action; currentSrc: string | null; initials: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const data = useRef<HTMLInputElement>(null);
  const shown = preview ?? currentSrc;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError("");
    if (!file) return;
    try {
      const url = await toSquareJpeg(file);
      if (data.current) data.current.value = url;
      setPreview(url);
    } catch {
      setError("Couldn't read that photo. Try a JPG or PNG.");
    }
  }

  return (
    <div className="stack">
      <div className="row" style={{ gap: 16 }}>
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="Team picture" width={72} height={72} style={{ width: 72, height: 72, borderRadius: 18, objectFit: "cover" }} />
        ) : (
          <span style={{ width: 72, height: 72, borderRadius: 18, display: "grid", placeItems: "center", background: "var(--accent)", color: "var(--accent-ink)", fontWeight: 700, fontSize: 24 }}>{initials}</span>
        )}
        <div className="grow text-sm text-muted">Shown next to your team name for everyone in the league. Any photo works; it&apos;s cropped to a square.</div>
      </div>
      <ActionForm action={saveAction} className="stack">
        <input type="hidden" name="picture" ref={data} />
        <input type="file" accept="image/*" onChange={onPick} aria-label="Choose a team picture" className="text-sm" />
        {error ? <p role="alert" className="text-sm text-lose">{error}</p> : null}
        <SubmitButton className="btn btn-primary btn-sm">Save picture</SubmitButton>
      </ActionForm>
      {currentSrc ? (
        <ActionForm action={removeAction}>
          <SubmitButton className="btn btn-sm" pendingText="…">Remove picture</SubmitButton>
        </ActionForm>
      ) : null}
    </div>
  );
}
