import type { AnswerValue, Question } from "@/lib/types";

export interface EditHandlers {
  setOptions: (options: { id?: number; label: string }[]) => void;
  openBulkChoices: () => void;
}

export interface BodyProps {
  question: Question;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  /** Explicit "I'm done" (Enter). */
  onSubmit: () => void;
  /** True for the question currently on screen; only it listens to the keyboard. */
  active: boolean;
  letters: boolean;
  edit?: EditHandlers;
}

/** Keystrokes typed into a field must never trigger letter shortcuts elsewhere. */
export const typingInField = (e: KeyboardEvent) =>
  e.target instanceof HTMLElement && (e.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName));
