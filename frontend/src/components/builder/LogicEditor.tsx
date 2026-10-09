"use client";

import { useEffect, useRef } from "react";
import type { LogicRule, Operator, Question } from "@/lib/types";
import { Icon } from "../icons";
import { Button, IconButton, TypeTile } from "../ui";
import type { Editor } from "./useFormEditor";

const OPERATORS: Record<Operator, string> = { is: "is", is_not: "is not", lt: "is lower than", gt: "is greater than", always: "Always" };

function operatorsFor(q: Question): Operator[] {
  if (q.type === "rating" || q.type === "number") return ["is", "is_not", "lt", "gt"];
  if (q.type === "file_upload") return [];
  return ["is", "is_not"];
}

/** The Workflow tab: logic jumps written as sentences, one card per question. */
export function LogicEditor({ editor, focusId }: { editor: Editor; focusId?: number }) {
  const focused = useRef<HTMLElement>(null);
  useEffect(() => focused.current?.scrollIntoView({ block: "center" }), []);
  const { questions } = editor.form;

  return (
    <div className="mx-auto w-full max-w-[860px] overflow-y-auto px-2 pb-24">
      <div className="mb-6 mt-2">
        <h1 className="text-[22px]">Logic</h1>
        <p className="text-[14px] text-ink-2">Send people to different questions based on their answers. Rules run top to bottom; the first match wins. With no match, people go to the next question.</p>
      </div>
      {questions.length < 2 && <p className="rounded-xl bg-panel p-8 text-center text-ink-2">Add at least two questions to set up logic jumps.</p>}
      <ol className="space-y-3">
        {questions.map((q, i) => (
          <li key={q.id} ref={q.id === focusId ? (el) => { focused.current = el; } : undefined}
            className={`rounded-xl bg-panel p-4 ${q.id === focusId ? "ring-2 ring-ink/30" : ""}`}>
            <div className="flex items-start gap-3">
              <TypeTile type={q.type} label={i + 1} />
              <p className="flex-1 text-[15px]">{q.title || <i className="text-ink-3">Untitled question</i>}</p>
              {q.logic_rules.length > 0 && <span className="text-[12px] text-ink-3">{q.logic_rules.length} rule{q.logic_rules.length > 1 ? "s" : ""}</span>}
            </div>
            {i < questions.length - 1 && <Rules q={q} later={questions.slice(i + 1)} offset={i + 1} editor={editor} />}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Rules({ q, later, offset, editor }: { q: Question; later: Question[]; offset: number; editor: Editor }) {
  const ops = operatorsFor(q);
  const save = (rules: LogicRule[]) => editor.patchQuestion(q.id, { logic_rules: rules });
  const update = (i: number, patch: Partial<LogicRule>) => save(q.logic_rules.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const blank = (operator: Operator): LogicRule => ({
    operator, jump_to_question_id: later[0]?.id ?? null,
    option_id: operator !== "always" && q.options[0] ? q.options[0].id : null,
    value: q.type === "yes_no" ? "yes" : q.type === "rating" || q.type === "number" ? "3" : null,
  });
  const hasAlways = q.logic_rules.some((r) => r.operator === "always");

  return (
    <div className="ml-1 mt-3 space-y-2 border-l-2 border-line pl-4">
      {q.logic_rules.map((rule, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 text-[14px]">
          {rule.operator === "always" ? (
            <span className="font-medium">All other cases</span>
          ) : (
            <>
              <span className="font-medium">If</span>
              <Select value={rule.operator} onChange={(v) => update(i, { operator: v as Operator })}
                options={ops.map((o) => [o, OPERATORS[o]])} />
              <ValueInput q={q} rule={rule} onChange={(patch) => update(i, patch)} />
            </>
          )}
          <span className="flex items-center gap-1 text-ink-2"><Icon name="right" size={14} /> go to</span>
          <Select value={String(rule.jump_to_question_id ?? "end")}
            onChange={(v) => update(i, { jump_to_question_id: v === "end" ? null : Number(v) })}
            options={[...later.map((t, j) => [String(t.id), `${offset + j + 1}. ${t.title || "Untitled"}`] as [string, string]), ["end", "End of form"]]} />
          <IconButton icon="trash" label="Delete rule" onClick={() => save(q.logic_rules.filter((_, j) => j !== i))} />
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        {ops.length > 0 && <Button variant="ghost" icon="plus" onClick={() => save([...q.logic_rules.filter((r) => r.operator !== "always"), blank(ops[0]), ...q.logic_rules.filter((r) => r.operator === "always")])}>Add rule</Button>}
        {!hasAlways && <Button variant="ghost" icon="branch" onClick={() => save([...q.logic_rules, blank("always")])}>All other cases</Button>}
      </div>
    </div>
  );
}

function ValueInput({ q, rule, onChange }: { q: Question; rule: LogicRule; onChange: (patch: Partial<LogicRule>) => void }) {
  if (q.type === "multiple_choice" || q.type === "dropdown") {
    return <Select value={String(rule.option_id ?? "")} onChange={(v) => onChange({ option_id: Number(v), value: null })}
      options={q.options.map((o) => [String(o.id), o.label || "Untitled choice"])} />;
  }
  if (q.type === "yes_no") {
    return <Select value={rule.value ?? "yes"} onChange={(value) => onChange({ value, option_id: null })} options={[["yes", "Yes"], ["no", "No"]]} />;
  }
  const numeric = q.type === "rating" || q.type === "number";
  return (
    <input key={rule.value} defaultValue={rule.value ?? ""} type={numeric ? "number" : "text"} aria-label="Value"
      onBlur={(e) => e.target.value !== (rule.value ?? "") && onChange({ value: e.target.value, option_id: null })}
      className="h-8 w-32 rounded-lg border border-line bg-surface px-2 outline-none focus:border-ink" />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="h-8 max-w-[260px] truncate rounded-lg border border-line bg-surface px-2 text-[14px] outline-none focus:border-ink">
      {options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
    </select>
  );
}
