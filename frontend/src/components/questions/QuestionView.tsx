"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { AnswerValue, Question } from "@/lib/types";
import { ChoiceBody } from "./ChoiceBody";
import { DropdownBody } from "./DropdownBody";
import { FileBody } from "./FileBody";
import { RatingBody } from "./RatingBody";
import { TextBody } from "./TextBody";
import type { BodyProps, EditHandlers } from "./types";

const BODIES = {
  short_text: TextBody, long_text: TextBody, email: TextBody, number: TextBody,
  multiple_choice: ChoiceBody, yes_no: ChoiceBody,
  dropdown: DropdownBody, rating: RatingBody, file_upload: FileBody,
} satisfies Record<Question["type"], React.ComponentType<BodyProps & { slug?: string }>>;

export interface QuestionEdit extends EditHandlers {
  setText: (field: "title" | "description", value: string) => void;
}

interface Props {
  question: Question;
  number: number | null;
  value?: AnswerValue;
  onChange?: (value: AnswerValue) => void;
  onSubmit?: () => void;
  active?: boolean;
  letters?: boolean;
  slug?: string;
  /** Present in the builder: title, description and choices become editable in place. */
  edit?: QuestionEdit;
}

/** The single renderer for a question, used by both the public form and the builder canvas —
 *  which is why the builder's preview can never drift from what respondents see. */
export function QuestionView({ question, number, value, onChange = () => {}, onSubmit = () => {}, active = false, letters = true, slug, edit }: Props) {
  const Body = BODIES[question.type];
  return (
    <div className="w-full">
      <div className="relative">
        {number !== null && (
          <span aria-hidden className="absolute -left-7 top-[0.45em] grid h-4 min-w-4 place-items-center rounded-[3px] px-[3px] text-[10px] font-bold max-sm:static max-sm:mb-3 max-sm:inline-grid"
            style={{ background: "var(--tf-q)", color: "var(--tf-bg)" }}>
            {number}
          </span>
        )}
        <h2 className="text-[22px] leading-[1.3] sm:text-[26px]">
          {edit ? (
            <InlineText value={question.title} onCommit={(v) => edit.setText("title", v)}
              placeholder="Your question here. Recall information with @" suffix={question.required ? "*" : ""} />
          ) : (
            <>{question.title || "…"}{question.required && <span aria-label="required">*</span>}</>
          )}
        </h2>
        {(edit || question.description) && (
          <div className="mt-2 text-[17px] leading-snug sm:text-[20px]" style={{ color: "var(--tf-q-soft)" }}>
            {edit ? (
              <InlineText value={question.description} onCommit={(v) => edit.setText("description", v)} placeholder="Description (optional)" />
            ) : (
              <p className="whitespace-pre-line">{question.description}</p>
            )}
          </div>
        )}
      </div>
      <div className="mt-7 sm:mt-8">
        <Body question={question} value={value} onChange={onChange} onSubmit={onSubmit} active={active}
          letters={letters} edit={edit} slug={slug} />
      </div>
    </div>
  );
}

/** A borderless auto-growing text area that saves when you leave it — Typeform's canvas editing. */
export function InlineText({ value, onCommit, placeholder, suffix = "" }: { value: string; onCommit: (v: string) => void; placeholder: string; suffix?: string }) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => setDraft(value), [value]);
  useLayoutEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "0px";
    ref.current.style.height = `${ref.current.scrollHeight}px`;
  }, [draft]);
  return (
    <span className="relative block">
      <textarea ref={ref} rows={1} value={draft} placeholder={placeholder} aria-label={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== value && onCommit(draft)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); } }}
        className="block w-full resize-none overflow-hidden bg-transparent outline-none placeholder:italic placeholder:opacity-45" />
      {suffix && draft && <span aria-hidden className="pointer-events-none absolute top-0 left-0 whitespace-pre-wrap"><span className="invisible">{draft}</span>{suffix}</span>}
    </span>
  );
}
