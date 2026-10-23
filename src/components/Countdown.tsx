"use client";

import { useEffect, useState } from "react";

export function Countdown({ deadline }: { deadline: string | null }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!deadline) return;
    const tick = () => setLeft(Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [deadline]);
  if (!deadline || left === null) return <span>--</span>;
  const m = Math.floor(left / 60);
  const s = String(left % 60).padStart(2, "0");
  return <span className={left <= 10 ? "text-lose" : ""}>{m}:{s}</span>;
}
