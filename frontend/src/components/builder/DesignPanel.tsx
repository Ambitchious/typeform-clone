"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { FONTS, themeVars } from "@/lib/theme";
import type { Theme } from "@/lib/types";
import { Icon, type IconName } from "../icons";
import { Button, IconButton, Menu, Modal, PremiumBadge } from "../ui";
import type { Editor } from "./useFormEditor";

type Draft = Omit<Theme, "id" | "is_gallery"> & { id?: number };
type EditTab = "logo" | "font" | "buttons" | "background";
const EDIT_TABS: [EditTab, string][] = [["logo", "Logo"], ["font", "Font"], ["buttons", "Buttons"], ["background", "Background"]];
const SWATCHES = ["#879a2c", "#5dd3c9", "#f9c933", "#fd6f12", "#3f9cfd", "#d55a9e", "#4d1a48", "#05684f", "#0784af"];

interface Props { open: boolean; onClose: () => void; editor: Editor; anchor: HTMLElement | null }

/** Typeform's Design panel: a floating, draggable window over the canvas (not a modal), with a theme
 *  list and a tabbed theme editor whose changes preview live on the canvas until saved. */
export function DesignPanel({ open, onClose, editor, anchor }: Props) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [tab, setTab] = useState<"mine" | "gallery">("gallery");
  const [editing, setEditing] = useState<{ draft: Draft; saved: string; tab: EditTab } | null>(null);
  const [original, setOriginal] = useState<Theme | null>(null);
  const [confirm, setConfirm] = useState<null | (() => void)>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [renaming, setRenaming] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    api.themes().then(setThemes).catch(() => toast.error("Couldn't load themes"));
    const r = anchor?.getBoundingClientRect();
    setPos({ x: Math.max(16, (r?.left ?? 300) - 12), y: (r?.bottom ?? 100) + 6 });
  }, [open, anchor]);

  const current = editor.form.theme;
  const dirty = !!editing && (editing.draft.id === undefined || JSON.stringify(editing.draft) !== editing.saved);

  // While editing, the canvas shows the draft; discarding puts the saved theme back.
  const preview = (draft: Draft) => editor.setForm((f) => ({ ...f, theme: { ...f.theme, ...draft, id: f.theme.id } }));
  const edit = (draft: Draft) => {
    setOriginal(current);
    setEditing({ draft, saved: JSON.stringify(draft), tab: "font" });
    preview(draft);
  };
  const change = (draft: Draft) => {
    setEditing((e) => e && { ...e, draft });
    preview(draft);
  };
  const discard = () => {
    if (original) editor.setForm((f) => ({ ...f, theme: original }));
    setEditing(null);
  };
  /** Leaving the editor with unsaved changes asks first, like Typeform. */
  const leave = (then: () => void) => (dirty ? setConfirm(() => then) : (discard(), then()));

  const save = async () => {
    if (!editing) return;
    const { id, ...body } = editing.draft;
    try {
      const saved = id ? await api.updateTheme(id, body) : await api.createTheme(body);
      setThemes((list) => [...list.filter((t) => t.id !== saved.id), saved]);
      await editor.setTheme(saved);
      setEditing(null);
      setTab("mine");
      toast.success(id ? "Theme updated for every form using it" : "Theme saved to My themes");
    } catch {
      toast.error("Couldn't save the theme");
    }
  };

  const duplicate = async (t: Theme) => {
    const copy = await api.createTheme({ ...t, name: `${t.name} (Copy)` });
    setThemes((list) => [...list, copy]);
    toast.success("Theme duplicated");
  };
  const rename = async (t: Theme, name: string) => {
    setRenaming(null);
    if (!name.trim() || name.trim() === t.name) return;
    const { id, ...body } = t;
    const saved = await api.updateTheme(id, { ...body, name: name.trim() }).catch(() => null);
    if (!saved) return toast.error("Couldn't rename the theme");
    setThemes((list) => list.map((x) => (x.id === id ? saved : x)));
    if (current.id === id) editor.setForm((f) => ({ ...f, theme: saved }));
  };
  const remove = async (t: Theme) => {
    try {
      await api.deleteTheme(t.id);
      setThemes((list) => list.filter((x) => x.id !== t.id));
      toast.success("Theme deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete the theme");
    }
  };

  // Drag by the handle; the panel stays inside the window.
  const drag = (e: ReactPointerEvent) => {
    const start = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    const move = (ev: PointerEvent) => setPos({
      x: Math.min(Math.max(ev.clientX - start.x, 0), window.innerWidth - 120),
      y: Math.min(Math.max(ev.clientY - start.y, 0), window.innerHeight - 60),
    });
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !confirm && leave(onClose);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  });

  if (!open) return null;
  const list = themes.filter((t) => (tab === "gallery" ? t.is_gallery : !t.is_gallery));

  return (
    <>
      <section role="dialog" aria-label="Design" style={{ left: pos.x, top: pos.y, maxHeight: `calc(100dvh - ${pos.y + 16}px)` }}
        className="fixed z-40 flex min-h-[220px] w-[546px] max-w-[calc(100vw-32px)] flex-col rounded-2xl border border-line bg-surface p-2 shadow-[0_8px_32px_rgba(0,0,0,0.14)]">
        <header className="flex items-center gap-2 px-2 pb-2 pt-1">
          <button type="button" onPointerDown={drag} aria-label="Drag to move" className="cursor-grab touch-none text-ink-2 active:cursor-grabbing">
            <Icon name="drag" size={18} strokeWidth={3} />
          </button>
          <h2 className="flex min-w-0 flex-1 items-center gap-1 text-[14px] font-medium text-ink">
            {editing ? (
              <>
                <button type="button" className="hover:underline" onClick={() => leave(() => {})}>Design</button>
                <Icon name="right" size={14} className="shrink-0" />
                <input value={editing.draft.name} onChange={(e) => change({ ...editing.draft, name: e.target.value })} aria-label="Theme name"
                  className="min-w-0 flex-1 rounded px-1 outline-none hover:bg-hover focus:bg-hover" />
              </>
            ) : "Design"}
          </h2>
          <IconButton icon="x" label="Close" onClick={() => leave(onClose)} />
        </header>

        <div className="flex min-h-0 flex-col rounded-xl bg-canvas">
          <Tabs items={editing ? EDIT_TABS : [["mine", "My themes"], ["gallery", "Gallery"]]} value={editing ? editing.tab : tab}
            onChange={(t) => (editing ? setEditing({ ...editing, tab: t as EditTab }) : setTab(t as "mine" | "gallery"))}
            badge={editing ? "logo" : undefined} />

          <div className="min-h-0 overflow-y-auto px-5 pb-5 pt-4">
            {editing ? (
              <ThemeEditor tab={editing.tab} draft={editing.draft} onChange={change} />
            ) : (
              <>
                {tab === "mine" && (
                  <div className="mb-4 divide-y divide-line">
                    <Row label={<>Brand kit themes <PremiumBadge /></>}>
                      <Button className="!h-7 !px-2 text-[13px]" onClick={() => toast("Brand kits are a paid Typeform feature — coming soon")}>Manage</Button>
                    </Row>
                    <Row label="My themes">
                      <IconButton icon="plus" label="New theme" className="border border-line bg-surface"
                        onClick={() => edit({ ...current, id: undefined, name: "My new theme" })} />
                    </Row>
                  </div>
                )}
                {list.length === 0 && tab === "mine" && (
                  <p className="pb-2 text-center text-[13px] text-ink-3">Edit any gallery theme, or press + to create your own.</p>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {list.map((t) => (
                    <ThemeCard key={t.id} theme={t} selected={t.id === current.id} onApply={() => editor.setTheme(t)}
                      renaming={renaming === t.id} onRename={(name) => rename(t, name)}
                      menu={[
                        { label: "Edit", onClick: () => edit(t.is_gallery ? { ...t, id: undefined, name: `${t.name} (Copy)` } : t) },
                        ...(t.is_gallery ? [] : [
                          { label: "Rename", onClick: () => setRenaming(t.id) },
                          { label: "Duplicate", onClick: () => duplicate(t) },
                          { label: "Delete", onClick: () => remove(t), danger: true },
                        ]),
                      ]} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {editing && (
          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={save} disabled={!dirty}>Save changes</Button>
          </div>
        )}
      </section>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Save changes to theme?" width={420}
        footer={<>
          <Button variant="ghost" onClick={() => { discard(); confirm?.(); setConfirm(null); }}>Discard changes</Button>
          <Button variant="primary" onClick={async () => { await save(); confirm?.(); setConfirm(null); }}>Save theme</Button>
        </>}>
        <p className="text-[14px] text-ink-2">You made changes to the {editing?.draft.name} theme, but you haven&apos;t saved them.</p>
      </Modal>
    </>
  );
}

function Tabs({ items, value, onChange, badge }: { items: [string, string][]; value: string; onChange: (v: string) => void; badge?: string }) {
  return (
    <div role="tablist" className="flex gap-5 border-b border-line px-4">
      {items.map(([id, label]) => (
        <button key={id} type="button" role="tab" aria-selected={value === id} onClick={() => onChange(id)}
          className={`-mb-px flex items-center gap-1.5 border-b-2 py-3 text-[14px] ${value === id ? "border-ink text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}>
          {label}{badge === id && <PremiumBadge />}
        </button>
      ))}
    </div>
  );
}

function ThemeCard({ theme, selected, onApply, menu, renaming, onRename }: {
  theme: Theme; selected: boolean; onApply: () => void; menu: { label: string; onClick: () => void; danger?: boolean }[];
  renaming?: boolean; onRename?: (name: string) => void;
}) {
  return (
    <div className={`overflow-hidden rounded-xl bg-surface transition ${selected ? "ring-2 ring-ink" : "ring-1 ring-line hover:ring-ink-3"}`}>
      <button type="button" className="tf block h-[108px] w-full px-5 pt-4 text-left" style={themeVars(theme)} onClick={onApply} aria-label={`Apply ${theme.name}`}>
        <span className="block text-[15px] font-medium">Question</span>
        <span className="block text-[15px]" style={{ color: "var(--tf-a)" }}>Answer</span>
        <span className="mt-3 block h-[18px] w-10" style={{ background: "var(--tf-btn)", borderRadius: "min(var(--tf-radius), 4px)" }} />
      </button>
      <div className="flex items-center justify-between px-4 py-3 text-[14px]">
        {renaming ? (
          <input autoFocus defaultValue={theme.name} aria-label="Theme name" onFocus={(e) => e.target.select()}
            onBlur={(e) => onRename?.(e.target.value)} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="min-w-0 flex-1 rounded border border-ink px-1 outline-none" />
        ) : <span className="truncate">{theme.name}</span>}
        <Menu align="left" items={menu} trigger={(o) => <IconButton icon="more" label={`${theme.name} options`} onClick={o} className="!size-6" />} />
      </div>
    </div>
  );
}

function ThemeEditor({ tab, draft, onChange }: { tab: EditTab; draft: Draft; onChange: (d: Draft) => void }) {
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

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return <div className="flex items-center justify-between py-3 text-[14px] text-ink"><span className="flex items-center gap-2">{label}</span>{children}</div>;
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
