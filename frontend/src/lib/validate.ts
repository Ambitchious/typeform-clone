// Client-side checks for instant feedback. The server repeats them (backend/app/validators.py)
// and is the one that decides; messages match so the respondent sees the same wording either way.
import { isEmpty } from "./logic";
import type { AnswerValue, Question } from "./types";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

export function validate(q: Question, value: AnswerValue | undefined): string | null {
  if (isEmpty(value)) return q.required ? "Please fill this in" : null;
  const { min, max, max_length, max_selections } = q.config;
  switch (q.type) {
    case "email":
      return EMAIL.test(String(value).trim()) ? null : "Hmm... that email doesn't look right";
    case "number": {
      const n = Number(value);
      if (Number.isNaN(n)) return "Hmm... that doesn't look like a number";
      if (min != null && n < min) return `Please enter a number greater than or equal to ${min}`;
      if (max != null && n > max) return `Please enter a number less than or equal to ${max}`;
      return null;
    }
    case "short_text":
    case "long_text":
      return max_length && String(value).length > max_length ? `Please keep it under ${max_length} characters` : null;
    case "multiple_choice":
      return max_selections && Array.isArray(value) && value.length > max_selections
        ? `Please select up to ${max_selections} options` : null;
    default:
      return null;
  }
}
