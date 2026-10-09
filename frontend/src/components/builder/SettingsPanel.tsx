"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Question, QuestionConfig, QuestionType } from "@/lib/types";
import { Icon, type IconName } from "../icons";
import { TYPES } from "../questions/registry";
import { Menu, PremiumBadge, Toggle, TypeTile } from "../ui";
import type { Editor } from "./useFormEditor";

export function SettingsPanel({ editor }: { editor: Editor }) {
  const { form, selected } = editor;
  const question = form.questions.find((q) => q.id === selected);
  return (
    <aside className="flex w-[256px] shrink-0 flex-col gap-4 overflow-y-auto" aria-label="Settings">
      {question && (
        <div className="rounded-xl bg-canvas p-4">
          <Label>Question <Icon name="help" size={14} className="text-ink-3" /></Label>
          <div className="grid grid-cols-2 rounded-lg bg-hover p-0.5 text-[14px]" role="radiogroup" aria-label="Question format">
            <button type="button" role="radio" aria-checked className="flex h-8 items-center justify-center gap-2 rounded-md bg-surface text-ink shadow-sm">
              <Icon name="shortText" size={16} /> Text
            </button>
            <button type="button" role="radio" aria-checked={false} onClick={() => toast("Video questions are coming soon")}
              className="flex h-8 items-center justify-center gap-2 rounded-md text-ink-2 hover:text-ink">
              <Icon name="video" size={16} /> Video
            </button>
          </div>
        </div>
      )}
      <div className="flex-1 rounded-xl bg-canvas p-4">
        {question && <QuestionSettings key={question.id} q={question} editor={editor} />}
        {selected === "welcome" && <WelcomeSettings editor={editor} />}
        {selected === "end" && <EndSettings editor={editor} />}
      </div>
      {question && (
        <>
          <div className="flex items-center justify-between rounded-xl bg-canvas px-4 py-3">
            <span className="text-[14px] font-medium">Logic</span>
            <Link href={`/forms/${form.id}/edit?tab=workflow&q=${question.id}`} aria-label="Edit logic"
              className="flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg border border-line bg-surface px-2 text-[13px] text-ink-2 hover:text-ink">
              {question.logic_rules.length > 0 && `${question.logic_rules.length} rule${question.logic_rules.length > 1 ? "s" : ""}`}
              <Icon name={question.logic_rules.length ? "right" : "plus"} size={16} />
            </Link>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-canvas px-4 py-3 text-[14px] font-medium">
            Comments <PremiumBadge />
          </div>
        </>
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
      {["short_text", "email", "number"].includes(q.type) && (
        <Toggle label="Map to contacts" hint="Save this answer to a contact profile" checked={false}
          onChange={() => toast("Contacts are coming soon")} />
      )}
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
          <div className="relative flex-1">
            <select value={String(c.steps ?? 5)} onChange={(e) => set({ steps: Number(e.target.value) })} aria-label="Steps"
              className="h-9 w-full appearance-none rounded-lg border border-line bg-surface px-3 text-[14px] text-ink outline-none">
              {Array.from({ length: 8 }, (_, i) => <option key={i}>{i + 3}</option>)}
            </select>
            <Icon name="down" size={16} className="pointer-events-none absolute right-2.5 top-2.5 text-ink-2" />
          </div>
          <div className="flex-1">
            <Menu align="right" items={(["star", "heart", "thumb", "circle"] as const).map((shape) => (
              { label: shape[0].toUpperCase() + shape.slice(1), icon: shape as IconName, onClick: () => set({ shape }) }
            ))} trigger={(open) => (
              <button type="button" onClick={open} aria-label={`Shape: ${c.shape ?? "star"}`}
                className="flex h-9 w-full items-center justify-between rounded-lg border border-line bg-surface px-3 text-ink">
                <Icon name={(c.shape ?? "star") as IconName} size={18} /><Icon name="down" size={16} className="text-ink-2" />
              </button>
            )} />
          </div>
        </div>
      )}
      {(q.type === "short_text" || q.type === "long_text") && (
        <>
          <NumberSetting label="Max characters" value={c.max_length} min={1} onChange={(max_length) => set({ max_length })} />
          <NumberSetting label="Answer validation" hint="Minimum characters" value={c.min_length} min={1}
            onChange={(min_length) => set({ min_length })} />
        </>
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
      <hr className="my-3 border-line" />
      <div className="flex items-center justify-between text-[14px] text-ink">
        Image or video
        <button type="button" aria-label="Add image or video" onClick={() => toast("Images and videos on questions are coming soon")}
          className="grid size-8 place-items-center rounded-lg border border-line bg-surface text-ink-2 hover:text-ink">
          <Icon name="plus" size={16} />
        </button>
      </div>
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
  return <h3 className="mb-2 flex items-center gap-1.5 text-[14px] font-medium text-ink">{children}</h3>;
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
function NumberSetting({ label, value, onChange, min, hint }: {
  label: string; value?: number | null; onChange: (v: number | null) => void; min?: number; hint?: string;
}) {
  const [on, setOn] = useState(value != null);
  const [draft, setDraft] = useState(value != null ? String(value) : "");
  useEffect(() => setDraft(value != null ? String(value) : ""), [value]);
  return (
    <>
      <Toggle label={label} checked={on} onChange={(v) => { setOn(v); if (!v) onChange(null); }} />
      {on && (
        <input type="number" value={draft} min={min} placeholder={hint ?? "0-999999999"} aria-label={hint ?? label}
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
