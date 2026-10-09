"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { toast } from "sonner";
import { FONTS } from "@/lib/theme";
import type { Theme } from "@/lib/types";
import { Icon, type IconName } from "../icons";
import { Button } from "../ui";

export type Draft = Omit<Theme, "id" | "is_gallery"> & { id?: number };
export type EditTab = "logo" | "font" | "buttons" | "background";
const SWATCHES = ["#879a2c", "#5dd3c9", "#f9c933", "#fd6f12", "#3f9cfd", "#d55a9e", "#4d1a48", "#05684f", "#0784af"];

/** The tabs of Typeform's theme editor (Logo, Font, Buttons, Background); every change previews live. */
export function ThemeEditor({ tab, draft, onChange }: { tab: EditTab; draft: Draft; onChange: (d: Draft) => void }) {
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  if (tab === "logo") {
    return <Button icon="plus" onClick={() => toast("Logos are a paid Typeform feature — coming soon")}>Add logo</Button>;
  }
  if (tab === "font") {
    return (
      <div className="divide-y divide-line">
        <Section title="Font">
          <div className="relative">
            <select value={draft.font} onChange={(e) => set({ font: e.target.value })} aria-label="Font"
              className="h-9 w-full appearance-none rounded-lg border border-line bg-surface px-3 text-[14px] outline-none focus:border-ink">
              {Object.keys(FONTS).map((f) => <option key={f}>{f}</option>)}
            </select>
            <Icon name="down" size={16} className="pointer-events-none absolute right-3 top-2.5 text-ink-2" />
          </div>
        </Section>
        <Section title="Color">
          <ColorRow label="Titles and questions" value={draft.question_color} onChange={(question_color) => set({ question_color })} />
        </Section>
        <Section title="Size and positioning">
          <SizeRow label="Welcome screen and endings" size={draft.welcome_size} align={draft.welcome_align}
            onSize={(welcome_size) => set({ welcome_size })} onAlign={(welcome_align) => set({ welcome_align })} />
          <SizeRow label="Questions" size={draft.question_size} align={draft.question_align}
            onSize={(question_size) => set({ question_size })} onAlign={(question_align) => set({ question_align })} />
        </Section>
      </div>
    );
  }
  if (tab === "buttons") {
    return (
      <div className="divide-y divide-line">
        <Section title="Color">
          <ColorRow label="Buttons" value={draft.button_color} onChange={(button_color) => set({ button_color })} />
          <ColorRow label="Button text" value={draft.button_text_color} onChange={(button_text_color) => set({ button_text_color })} />
          <ColorRow label="Answers" value={draft.answer_color} onChange={(answer_color) => set({ answer_color })} />
        </Section>
        <Section title="Corner radius">
          <Segmented value={draft.corner_radius} onChange={(corner_radius) => set({ corner_radius })}
            items={[["square", "cornerSquare", "Square"], ["rounded", "cornerRounded", "Rounded"], ["pill", "cornerPill", "Pill"]]} />
        </Section>
      </div>
    );
  }
  return (
    <div className="divide-y divide-line">
      <Section title="Color">
        <ColorRow label="Background" value={draft.background_color} onChange={(background_color) => set({ background_color })} />
      </Section>
      <Section title="Background image">
        {draft.background_image_url ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={draft.background_image_url} alt="" className="h-14 w-20 rounded-md object-cover ring-1 ring-line" />
            <Button icon="trash" onClick={() => set({ background_image_url: null })}>Remove</Button>
          </div>
        ) : imageUrl === null ? (
          <Button icon="plus" onClick={() => setImageUrl("")}>Add image</Button>
        ) : (
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (imageUrl.trim()) set({ background_image_url: imageUrl.trim() }); setImageUrl(null); }}>
            <input autoFocus type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Paste an image link (https://…)"
              className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-[14px] outline-none focus:border-ink" />
            <Button variant="primary" type="submit">Add</Button>
          </form>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 py-4 first:pt-0 last:pb-0">
      <h3 className="text-[14px] font-medium text-ink">{title}</h3>
      {children}
    </section>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [at, setAt] = useState<DOMRect | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const open = !!at;
  useEffect(() => {
    if (!at) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setAt(null);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [at]);
  // The picker is fixed-positioned so the panel's scroll area can't clip it; it opens upwards near the bottom.
  const PICKER_HEIGHT = 290;
  const top = at && (at.bottom + PICKER_HEIGHT > window.innerHeight ? at.top - PICKER_HEIGHT - 4 : at.bottom + 4);
  return (
    <div ref={ref} className="relative flex items-center justify-between text-[14px] text-ink-2">
      {label}
      <button type="button" onClick={(e) => setAt(at ? null : e.currentTarget.getBoundingClientRect())} aria-label={`${label} colour, ${value}`} aria-expanded={open}
        className="flex h-8 items-center gap-1 rounded-lg border border-line bg-surface px-2 text-ink hover:bg-hover">
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden><path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z" fill={value} stroke="currentColor" strokeWidth="1.5" /></svg>
        <Icon name="down" size={14} />
      </button>
      {at && (
        <div style={{ top: top!, left: at.right - 224 }} className="fixed z-[60] w-[224px] space-y-2.5 rounded-xl border border-line bg-surface p-2.5 shadow-xl">
          <HexColorPicker color={value} onChange={onChange} style={{ width: "100%", height: 150 }} />
          <div className="flex h-8 items-center gap-2 rounded-lg border border-line px-1.5">
            <span className="size-5 rounded border border-line" style={{ background: value }} />
            <HexColorInput color={value} onChange={onChange} prefixed aria-label="Hex colour" className="min-w-0 flex-1 bg-transparent text-[14px] uppercase text-ink outline-none" />
          </div>
          <div className="grid grid-cols-5 gap-2">
            {SWATCHES.map((c) => (
              <button key={c} type="button" onClick={() => onChange(c)} aria-label={c} className="aspect-square rounded-md ring-line hover:ring-2" style={{ background: c }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SizeRow<S extends string, A extends string>({ label, size, align, onSize, onAlign }: {
  label: string; size: S; align: A; onSize: (s: S) => void; onAlign: (a: A) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[14px] text-ink-2">{label}</p>
      <div className="flex gap-3">
        <Segmented value={size} onChange={onSize} items={[["sm" as S, "Sm"], ["md" as S, "Md"], ["lg" as S, "Lg"]]} />
        <Segmented value={align} onChange={onAlign} items={[["left" as A, "alignLeft", "Align left"], ["center" as A, "alignCenter", "Align center"]]} />
      </div>
    </div>
  );
}

/** A Typeform segmented control; items are [value, text] or [value, icon, accessible label]. */
function Segmented<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: ([T, string] | [T, IconName, string])[] }) {
  return (
    <div className="inline-flex rounded-lg bg-hover p-0.5" role="radiogroup">
      {items.map(([v, content, label]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} aria-label={label} title={label} onClick={() => onChange(v)}
          className={`grid h-8 min-w-9 place-items-center rounded-md px-2 text-[14px] ${value === v ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink"}`}>
          {label ? <Icon name={content as IconName} size={18} /> : content}
        </button>
      ))}
    </div>
  );
}
