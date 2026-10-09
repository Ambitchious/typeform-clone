"""Logic jumps. The same rules run in the browser (to decide what to show next) and here
(to know which questions the respondent actually saw, so hidden required questions are not
demanded). Keep this file and frontend/src/lib/logic.ts in sync."""

from typing import Any

from .models import LogicRule, Question
from .validators import is_empty


def rule_matches(rule: LogicRule, value: Any) -> bool:
    if rule.operator == "always":
        return True
    if is_empty(value):
        return False
    if rule.operator in ("is", "is_not"):
        if rule.option_id is not None:
            selected = value if isinstance(value, list) else [value]
            hit = rule.option_id in selected
        else:
            hit = str(value).lower() == str(rule.value).lower()
        return hit if rule.operator == "is" else not hit
    try:
        number, target = float(value), float(rule.value)
    except (TypeError, ValueError):
        return False
    return number < target if rule.operator == "lt" else number > target


def next_index(questions: list[Question], index: int, value: Any) -> int | None:
    """Index of the question shown after questions[index], or None when the form ends."""
    for rule in questions[index].logic_rules:
        if rule_matches(rule, value):
            if rule.jump_to_question_id is None:
                return None
            for i, q in enumerate(questions):
                if q.id == rule.jump_to_question_id and i > index:
                    return i
    return index + 1 if index + 1 < len(questions) else None


def visible_path(questions: list[Question], answers: dict[int, Any]) -> list[Question]:
    path, index = [], 0 if questions else None
    while index is not None:
        q = questions[index]
        path.append(q)
        index = next_index(questions, index, answers.get(q.id))
    return path
