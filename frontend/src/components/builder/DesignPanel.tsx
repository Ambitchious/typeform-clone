"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { FONTS, themeVars } from "@/lib/theme";
import type { Theme } from "@/lib/types";
import { Button, IconButton, Menu, Modal } from "../ui";
import type { Editor } from "./useFormEditor";

type Draft = Omit<Theme, "id" | "is_gallery"> & { id?: number };
const COLOR_FIELDS: [keyof Draft, string][] = [
  ["question_color", "Questions"], ["answer_color", "Answers"], ["button_color", "Buttons"],
  ["button_text_color", "Button text"], ["background_color", "Background"],
];

export function DesignPanel({ open, onClose, editor }: { open: boolean; onClose: () => void; editor: Editor }) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [tab, setTab] = useState<"mine" | "gallery">("gallery");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [original, setOriginal] = useState<Theme | null>(null);

  useEffect(() => {
    if (open) api.themes().then(setThemes).catch(() => toast.error("Couldn't load themes"));
  }, [open]);

  const current = editor.form.theme;
  // While editing, the canvas shows the draft live; Cancel puts the saved theme back.
  const preview = (d: Draft) => {
    setDraft(d);
    editor.setForm((f) => ({ ...f, theme: { ...f.theme, ...d, id: f.theme.id } }));
  };
  const startEdit = (theme: Theme, copy: boolean) => {
    setOriginal(current);
    preview(copy ? { ...theme, id: undefined, name: `${theme.name} copy` } : theme);
  };
  const cancel = () => {
    if (original) editor.setForm((f) => ({ ...f, theme: original }));
    setDraft(null);
  };
  const save = async () => {
    if (!draft) return;
    const { id, ...body } = draft;
    try {
      const saved = id ? await api.updateTheme(id, body) : await api.createTheme(body);
      setThemes((list) => [...list.filter((t) => t.id !== saved.id), saved]);
      await editor.setTheme(saved);
      setDraft(null);
      setTab("mine");
      toast.success(id ? "Theme updated for every form using it" : "Theme saved");
    } catch {
      toast.error("Couldn't save the theme");
    }
  };

  const list = themes.filter((t) => (tab === "gallery" ? t.is_gallery : !t.is_gallery));

  return (
    <Modal open={open} onClose={() => { cancel(); onClose(); }} width={560} title={draft ? "Edit theme" : "Design"}
      footer={draft ? <><Button onClick={cancel}>Cancel</Button><Button variant="primary" onClick={save}>Save theme</Button></> : undefined}>
      {draft ? (
        <ThemeEditor draft={draft} onChange={preview} />
      ) : (
        <>
          <div className="mb-4 flex items-center gap-4 border-b border-line">
            {(["mine", "gallery"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)}
                className={`-mb-px border-b-2 pb-2 text-[14px] ${tab === t ? "border-ink text-ink" : "border-transparent text-ink-2"}`}>
                {t === "mine" ? "My themes" : "Gallery"}
              </button>
            ))}
            <Button variant="ghost" icon="plus" className="mb-1 ml-auto" onClick={() => startEdit(current, true)}>New theme</Button>
          </div>
          {list.length === 0 && <p className="py-8 text-center text-[14px] text-ink-3">No themes yet — create one from any theme you like.</p>}
          <div className="grid grid-cols-2 gap-3">
            {list.map((t) => (
              <div key={t.id} className={`overflow-hidden rounded-xl border-2 ${t.id === current.id ? "border-ink" : "border-line"}`}>
                <button type="button" className="tf block w-full p-4 text-left" style={themeVars(t)} onClick={() => editor.setTheme(t)} aria-label={`Apply ${t.name}`}>
                  <span className="block text-[17px]">Question</span>
                  <span className="block text-[17px]" style={{ color: "var(--tf-a)" }}>Answer</span>
                  <span className="mt-3 block h-6 w-14" style={{ background: "var(--tf-btn)", borderRadius: "min(var(--tf-radius), 12px)" }} />
                </button>
                <div className="flex items-center justify-between bg-surface px-3 py-2 text-[14px]">
                  <span className="truncate">{t.name}</span>
                  <Menu items={[
                    ...(t.is_gallery ? [] : [{ label: "Edit", onClick: () => startEdit(t, false) }]),
                    { label: "Duplicate & edit", onClick: () => startEdit(t, true) },
                  ]} trigger={(o) => <IconButton icon="more" label={`${t.name} options`} onClick={o} />} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}

function ThemeEditor({ draft, onChange }: { draft: Draft; onChange: (d: Draft) => void }) {
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });
  return (
    <div className="space-y-4 text-[14px]">
      <label className="block">
        <span className="mb-1 block text-ink-2">Name</span>
        <input value={draft.name} onChange={(e) => set({ name: e.target.value })} className="h-9 w-full rounded-lg border border-line bg-surface px-3 outline-none focus:border-ink" />
      </label>
      <label className="block">
        <span className="mb-1 block text-ink-2">Font</span>
        <select value={draft.font} onChange={(e) => set({ font: e.target.value })} className="h-9 w-full rounded-lg border border-line bg-surface px-2 outline-none">
          {Object.keys(FONTS).map((f) => <option key={f}>{f}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {COLOR_FIELDS.map(([key, label]) => (
          <label key={key} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-1.5">
            <span className="text-ink-2">{label}</span>
            <span className="flex items-center gap-2">
              <code className="text-[12px] text-ink-3">{String(draft[key]).toUpperCase()}</code>
              <input type="color" value={String(draft[key])} onChange={(e) => set({ [key]: e.target.value })} className="size-7 cursor-pointer rounded border-0 bg-transparent" aria-label={label} />
            </span>
          </label>
        ))}
      </div>
      <label className="block">
        <span className="mb-1 block text-ink-2">Background image URL (optional)</span>
        <input value={draft.background_image_url ?? ""} placeholder="https://…" onChange={(e) => set({ background_image_url: e.target.value || null })}
          className="h-9 w-full rounded-lg border border-line bg-surface px-3 outline-none focus:border-ink" />
      </label>
      <div>
        <span className="mb-1 block text-ink-2">Corner radius</span>
        <div className="inline-flex rounded-lg bg-canvas p-1">
          {(["square", "rounded", "pill"] as const).map((r) => (
            <button key={r} type="button" onClick={() => set({ corner_radius: r })} aria-pressed={draft.corner_radius === r}
              className={`rounded-md px-3 py-1 capitalize ${draft.corner_radius === r ? "bg-surface shadow-sm" : "text-ink-2"}`}>{r}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
