"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../icons";
import { LETTERS } from "./registry";
import { typingInField, type BodyProps } from "./types";

interface Item { key: string; label: string; value: number | string }

/** Multiple choice and Yes/No: lettered options, keyboard shortcuts, single or multi select. */
export function ChoiceBody({ question, value, onChange, active, letters, edit }: BodyProps) {
  const yesNo = question.type === "yes_no";
  const multiple = !yesNo && !!question.config.multiple;

  const items: Item[] = useMemo(() => {
    if (yesNo) return [{ key: "Y", label: "Yes", value: "yes" }, { key: "N", label: "No", value: "no" }];
    let options = question.options;
    if (question.config.randomize && !edit) options = shuffled(options, question.id);
    return options.map((o, i) => ({ key: LETTERS[i] ?? "", label: o.label, value: o.id }));
  }, [yesNo, question.options, question.config.randomize, question.id, edit]);

  const selected = new Set<number | string>(Array.isArray(value) ? value : value != null ? [value] : []);

  const toggle = (item: Item) => {
    if (yesNo) return onChange(item.value as string);
    const id = item.value as number;
    if (!multiple) return onChange([id]);
    const next = selected.has(id) ? [...selected].filter((v) => v !== id) : [...selected, id];
    const limit = question.config.max_selections;
    if (limit && next.length > limit) return;
    onChange(next as number[]);
  };

  useEffect(() => {
    if (!active || edit || !letters) return;
    const onKey = (e: KeyboardEvent) => {
      if (typingInField(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const item = items.find((it) => it.key === e.key.toUpperCase());
      if (item) {
        e.preventDefault();
        toggle(item);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (edit) return <EditableOptions question={question} edit={edit} yesNo={yesNo} />;

  return (
    <div>
      {multiple && <p className="mb-3 text-[14px]" style={{ color: "var(--tf-a)" }}>Choose as many as you like</p>}
      <div role={multiple ? "group" : "radiogroup"} aria-label={question.title} className="inline-flex max-w-full flex-col gap-2">
        {items.map((item) => (
          <ChoiceButton key={item.key + item.label} item={item} letters={letters} multiple={multiple}
            checked={selected.has(item.value)} onClick={() => toggle(item)} />
        ))}
      </div>
    </div>
  );
}

function ChoiceButton({ item, checked, onClick, letters, multiple }: {
  item: Item; checked: boolean; onClick: () => void; letters: boolean; multiple: boolean;
}) {
  // Blink when picked by click or key — but not when an earlier answer is restored on load.
  const [picked, setPicked] = useState(false);
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current && checked) setPicked(true);
    mounted.current = true;
  }, [checked]);
  return (
    <button type="button" role={multiple ? "checkbox" : "radio"} aria-checked={checked} onClick={onClick}
      className={`tf-choice ${checked && picked ? "tf-blink" : ""}`}>
      {letters && <span className="tf-key">{item.key}</span>}
      <span className="flex-1 break-words">{item.label}</span>
      {checked && <Icon name="check" size={18} />}
    </button>
  );
}

function EditableOptions({ question, edit, yesNo }: { question: BodyProps["question"]; edit: NonNullable<BodyProps["edit"]>; yesNo: boolean }) {
  const [drafts, setDrafts] = useState(question.options.map((o) => ({ id: o.id, label: o.label })));
  useEffect(() => setDrafts(question.options.map((o) => ({ id: o.id, label: o.label }))), [question.options]);

  if (yesNo) {
    return (
      <div className="inline-flex flex-col gap-2">
        {["Yes", "No"].map((label, i) => (
          <div key={label} className="tf-choice"><span className="tf-key">{"YN"[i]}</span>{label}</div>
        ))}
      </div>
    );
  }

  const commit = (next = drafts) => edit.setOptions(next.map(({ id, label }) => ({ id, label })));

  return (
    <div className="inline-flex max-w-full flex-col gap-2">
      {drafts.map((o, i) => (
        <div key={o.id} className="group/opt relative flex items-center">
          <label className="tf-choice cursor-text">
            <span className="tf-key">{LETTERS[i]}</span>
            <input value={o.label} aria-label={`Choice ${i + 1}`} placeholder={`Choice ${i + 1}`}
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:opacity-50"
              onChange={(e) => setDrafts(drafts.map((d) => (d.id === o.id ? { ...d, label: e.target.value } : d)))}
              onBlur={() => commit()}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
          </label>
          {drafts.length > 1 && (
            <button type="button" aria-label={`Delete choice ${i + 1}`}
              className="absolute -right-9 grid size-7 place-items-center rounded-full border border-current opacity-0 transition group-hover/opt:opacity-60 hover:!opacity-100 focus:opacity-100"
              onClick={() => { const next = drafts.filter((d) => d.id !== o.id); setDrafts(next); commit(next); }}>
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
      ))}
      <button type="button" className="mt-1 self-start text-[14px] underline underline-offset-4 opacity-80 hover:opacity-100"
        onClick={() => edit.setOptions([...drafts, { label: `Choice ${drafts.length + 1}` }])}>
        Add choice
      </button>
    </div>
  );
}

/** Stable shuffle per question, so the order doesn't jump around on every re-render. */
function shuffled<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
