"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Question, QuestionConfig, QuestionType } from "@/lib/types";
import { Icon, type IconName } from "../icons";
import { TYPES } from "../questions/registry";
import { Toggle, TypeTile } from "../ui";
import type { Editor } from "./useFormEditor";

export function SettingsPanel({ editor }: { editor: Editor }) {
  const { form, selected } = editor;
  const question = form.questions.find((q) => q.id === selected);
  return (
    <aside className="flex w-[288px] shrink-0 flex-col gap-3 overflow-y-auto" aria-label="Settings">
      <div className="rounded-xl bg-panel p-4">
        {question && <QuestionSettings key={question.id} q={question} editor={editor} />}
        {selected === "welcome" && <WelcomeSettings editor={editor} />}
        {selected === "end" && <EndSettings editor={editor} />}
      </div>
      {question && (
        <div className="flex items-center justify-between rounded-xl bg-panel p-4">
          <span className="text-[15px] font-medium">Logic</span>
          <Link href={`/forms/${form.id}/edit?tab=workflow&q=${question.id}`} className="flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink">
            {question.logic_rules.length ? `${question.logic_rules.length} rule${question.logic_rules.length > 1 ? "s" : ""}` : "Add"}
            <Icon name="right" size={14} />
          </Link>
        </div>
      )}
    </aside>
  );
}

function QuestionSettings({ q, editor }: { q: Question; editor: Editor }) {
  const set = (config: Partial<QuestionConfig>) => editor.patchQuestion(q.id, { config: { ...q.config, ...config } });
  const c = q.config;
  return (
    <>
      <Label>Answer</Label>
      <TypeSelect value={q.type} onChange={(type) => editor.patchQuestion(q.id, { type })} />
      <hr className="my-3 border-line" />
      <Toggle label="Required" checked={q.required} onChange={(required) => editor.patchQuestion(q.id, { required })} />

      {q.type === "multiple_choice" && (
        <>
          <Toggle label="Multiple selection" checked={!!c.multiple} onChange={(multiple) => set({ multiple, max_selections: null })} />
          {c.multiple && (
            <Select label="Selection limit" value={String(c.max_selections ?? "")} onChange={(v) => set({ max_selections: v ? Number(v) : null })}
              options={[["", "Unlimited"], ...Array.from({ length: Math.max(q.options.length - 1, 1) }, (_, i) => [String(i + 1), `Up to ${i + 1}`] as [string, string])]} />
          )}
          <Toggle label="Randomize" checked={!!c.randomize} onChange={(randomize) => set({ randomize })} />
        </>
      )}
      {q.type === "dropdown" && (
        <Toggle label="Alphabetical order" checked={!!c.alphabetical} onChange={(alphabetical) => set({ alphabetical })} />
      )}
      {q.type === "rating" && (
        <div className="flex gap-2 pt-2">
          <Select label="Steps" value={String(c.steps ?? 5)} onChange={(v) => set({ steps: Number(v) })}
            options={Array.from({ length: 8 }, (_, i) => [String(i + 3), String(i + 3)] as [string, string])} />
          <div className="flex-1">
            <span className="mb-1 block text-[12px] text-ink-3">Shape</span>
            <div className="flex gap-1" role="radiogroup" aria-label="Shape">
              {(["star", "heart", "thumb", "circle"] as const).map((shape) => (
                <button key={shape} type="button" role="radio" aria-checked={(c.shape ?? "star") === shape} aria-label={shape}
                  onClick={() => set({ shape })}
                  className={`grid size-9 place-items-center rounded-lg border ${(c.shape ?? "star") === shape ? "border-ink bg-surface" : "border-line hover:bg-hover"}`}>
                  <Icon name={shape as IconName} size={18} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {(q.type === "short_text" || q.type === "long_text") && (
        <NumberSetting label="Max characters" value={c.max_length} min={1} onChange={(max_length) => set({ max_length })} />
      )}
      {q.type === "number" && (
        <>
          <NumberSetting label="Min number" value={c.min} onChange={(min) => set({ min })} />
          <NumberSetting label="Max number" value={c.max} onChange={(max) => set({ max })} />
        </>
      )}
      {["short_text", "long_text", "email", "number", "dropdown"].includes(q.type) && (
        <TextSetting label="Custom placeholder text" value={c.placeholder} onChange={(placeholder) => set({ placeholder })} />
      )}
    </>
  );
}

function WelcomeSettings({ editor }: { editor: Editor }) {
  const w = editor.form.settings.welcome;
  const save = (patch: Partial<typeof w>) => editor.updateForm({ settings: { welcome: { ...w, ...patch } } });
  return (
    <>
      <Label>Welcome Screen</Label>
      <Toggle label="Time to complete" checked={w.show_time} onChange={(show_time) => save({ show_time })} />
      <ButtonText value={w.button} onChange={(button) => save({ button })} />
      <button type="button" onClick={() => { save({ enabled: false }); editor.setSelected(editor.form.questions[0]?.id ?? "end"); }}
        className="mt-4 flex items-center gap-1.5 text-[13px] text-[#c4381c] hover:underline">
        <Icon name="trash" size={14} /> Remove welcome screen
      </button>
    </>
  );
}

function EndSettings({ editor }: { editor: Editor }) {
  const t = editor.form.settings.thank_you;
  return (
    <>
      <Label>Ending</Label>
      <p className="mb-2 text-[13px] text-ink-3">Shown after a response is submitted.</p>
      <ButtonText value={t.button} placeholder="No button" onChange={(button) => editor.updateForm({ settings: { thank_you: { ...t, button } } })} />
    </>
  );
}

function TypeSelect({ value, onChange }: { value: QuestionType; onChange: (t: QuestionType) => void }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2"><TypeTile type={value} /></span>
      <select value={value} onChange={(e) => onChange(e.target.value as QuestionType)} aria-label="Question type"
        className="h-10 w-full appearance-none rounded-lg border border-line bg-surface pl-11 pr-8 text-[14px] text-ink outline-none">
        {Object.entries(TYPES).map(([type, info]) => <option key={type} value={type}>{info.label}</option>)}
      </select>
      <Icon name="down" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-2" />
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-[15px] font-medium text-ink">{children}</h3>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="block py-1">
      <span className="mb-1 block text-[12px] text-ink-3">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-line bg-surface px-2 text-[14px] text-ink outline-none">
        {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
      </select>
    </label>
  );
}

/** A toggle that reveals a number field when switched on (Typeform's progressive disclosure). */
function NumberSetting({ label, value, onChange, min }: { label: string; value?: number | null; onChange: (v: number | null) => void; min?: number }) {
  const [on, setOn] = useState(value != null);
  const [draft, setDraft] = useState(value != null ? String(value) : "");
  useEffect(() => setDraft(value != null ? String(value) : ""), [value]);
  return (
    <>
      <Toggle label={label} checked={on} onChange={(v) => { setOn(v); if (!v) onChange(null); }} />
      {on && (
        <input type="number" value={draft} min={min} placeholder="0-999999999" aria-label={label}
          onChange={(e) => setDraft(e.target.value)} onBlur={() => onChange(draft === "" ? null : Number(draft))}
          className="mb-1 h-9 w-full rounded-lg border border-line bg-surface px-3 text-[14px] text-ink outline-none focus:border-ink" />
      )}
    </>
  );
}

function TextSetting({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  const [on, setOn] = useState(!!value);
  const [draft, setDraft] = useState(value ?? "");
  return (
    <>
      <Toggle label={label} checked={on} onChange={(v) => { setOn(v); if (!v) { setDraft(""); onChange(""); } }} />
      {on && (
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => onChange(draft)} aria-label={label}
          className="mb-1 h-9 w-full rounded-lg border border-line bg-surface px-3 text-[14px] text-ink outline-none focus:border-ink" />
      )}
    </>
  );
}

function ButtonText({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <label className="mt-2 block">
      <span className="mb-1 block text-[14px] text-ink-2">Button</span>
      <input value={draft} maxLength={24} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onBlur={() => onChange(draft)}
        className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-[14px] text-ink outline-none focus:border-ink" />
      <span className="mt-1 block text-right text-[12px] text-ink-3">{draft.length}/24</span>
    </label>
  );
}
