"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { BodyProps } from "./types";

const PLACEHOLDER: Record<string, string> = {
  email: "name@example.com",
  number: "Type your answer here...",
  short_text: "Type your answer here...",
  long_text: "Type your answer here...",
};

/** Short text, long text, email and number: an underlined input in Typeform's style. */
export function TextBody({ question, value, onChange, onSubmit, active, edit }: BodyProps) {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const long = question.type === "long_text";
  const placeholder = question.config.placeholder || PLACEHOLDER[question.type];
  const text = value == null ? "" : String(value);

  // Autofocus the field when its question arrives — but not on touch screens, where it
  // would throw the keyboard up over the question before it has been read.
  useEffect(() => {
    if (active && !edit && !window.matchMedia("(pointer: coarse)").matches) ref.current?.focus({ preventScroll: true });
  }, [active, edit]);

  // Long answers grow the textarea instead of scrolling inside it.
  useLayoutEffect(() => {
    if (long && ref.current) {
      ref.current.style.height = "0px";
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [long, text]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !(long && e.shiftKey) && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSubmit();
    }
  };

  const onInput = (raw: string) => {
    if (question.type !== "number") return onChange(raw);
    // Like Typeform, letters (and a minus sign when negatives aren't allowed) never reach the field.
    const allowMinus = question.config.min == null || question.config.min < 0;
    const cleaned = raw.replace(allowMinus ? /[^\d.-]/g : /[^\d.]/g, "");
    onChange(cleaned);
  };

  const common = {
    ref, value: text, placeholder, disabled: !!edit, onKeyDown,
    className: "tf-input disabled:cursor-default",
    "aria-label": question.title || "Your answer",
  };

  return (
    <div className="max-w-[720px]">
      {long ? (
        <textarea {...common} rows={1} className={`${common.className} resize-none overflow-hidden`}
          onChange={(e) => onInput(e.target.value)} maxLength={question.config.max_length ?? undefined} />
      ) : (
        <input {...common} onChange={(e) => onInput(e.target.value)}
          type={question.type === "email" ? "email" : "text"}
          inputMode={question.type === "number" ? "decimal" : question.type === "email" ? "email" : "text"}
          autoComplete={question.type === "email" ? "email" : "off"}
          maxLength={question.config.max_length ?? undefined} />
      )}
      {long && (
        <p className="mt-2 text-[12px] opacity-80">
          <b>Shift ⇧</b> + <b>Enter ↵</b> to make a line break
        </p>
      )}
      {question.config.max_length && !edit && text.length >= question.config.max_length * 0.8 && (
        <p className="mt-2 text-[12px] opacity-70">{question.config.max_length - text.length} characters left</p>
      )}
    </div>
  );
}
