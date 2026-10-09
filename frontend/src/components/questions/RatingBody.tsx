"use client";

import { useEffect, useState } from "react";
import { Icon } from "../icons";
import { typingInField, type BodyProps } from "./types";

/** Stars (or hearts, thumbs, circles): hover previews, click or number keys pick. */
export function RatingBody({ question, value, onChange, active, edit }: BodyProps) {
  const steps = question.config.steps ?? 5;
  const shape = question.config.shape ?? "star";
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? (typeof value === "number" ? value : 0);

  useEffect(() => {
    if (!active || edit) return;
    const onKey = (e: KeyboardEvent) => {
      if (typingInField(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const n = e.key === "0" ? 10 : Number(e.key);
      if (n >= 1 && n <= steps) {
        e.preventDefault();
        onChange(n);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, edit, steps, onChange]);

  return (
    <div role="radiogroup" aria-label={question.title} className="flex flex-wrap gap-x-2 gap-y-3" onMouseLeave={() => setHover(null)}>
      {Array.from({ length: steps }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} out of ${steps}`}
          disabled={!!edit} onMouseEnter={() => setHover(n)} onClick={() => onChange(n)}
          className="group flex w-11 flex-col items-center gap-2 transition-transform hover:scale-110 disabled:hover:scale-100 sm:w-14"
          style={{ color: "var(--tf-a)" }}>
          <Icon name={shape} strokeWidth={1.4}
            className="size-9 transition-[fill] duration-150 sm:size-12"
            style={{ fill: n <= shown ? "color-mix(in srgb, var(--tf-a) 45%, transparent)" : "transparent" }} />
          <span className="text-[14px] opacity-80">{n}</span>
        </button>
      ))}
    </div>
  );
}
