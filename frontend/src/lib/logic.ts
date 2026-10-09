// Mirror of backend/app/logic.py — the browser decides what to show next, the server
// re-runs the same rules to know which questions were actually seen.
import type { AnswerValue, LogicRule, Question } from "./types";

export const isEmpty = (v: AnswerValue | undefined) =>
  v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

export function ruleMatches(rule: LogicRule, value: AnswerValue | undefined): boolean {
  if (rule.operator === "always") return true;
  if (isEmpty(value)) return false;
  if (rule.operator === "is" || rule.operator === "is_not") {
    const hit = rule.option_id !== null
      ? (Array.isArray(value) ? value : [value]).includes(rule.option_id)
      : String(value).toLowerCase() === String(rule.value).toLowerCase();
    return rule.operator === "is" ? hit : !hit;
  }
  const n = Number(value), target = Number(rule.value);
  if (Number.isNaN(n) || Number.isNaN(target)) return false;
  return rule.operator === "lt" ? n < target : n > target;
}

/** Index of the question after `index`, or null when the form should end. */
export function nextIndex(questions: Question[], index: number, value: AnswerValue | undefined): number | null {
  for (const rule of questions[index].logic_rules) {
    if (!ruleMatches(rule, value)) continue;
    if (rule.jump_to_question_id === null) return null;
    const target = questions.findIndex((q, i) => q.id === rule.jump_to_question_id && i > index);
    if (target !== -1) return target;
  }
  return index + 1 < questions.length ? index + 1 : null;
}
