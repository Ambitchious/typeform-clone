"""Per-type answer validation. Each validator takes the question and the raw submitted value
and returns the rows to store as (option_id, value) pairs, or raises AnswerError."""

import re
from collections.abc import Callable
from typing import Any

from .models import Question

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")


class AnswerError(ValueError):
    pass


Row = tuple[int | None, str | None]


def is_empty(value: Any) -> bool:
    return value is None or value == "" or value == [] or value == {}


def _text(q: Question, v: Any) -> list[Row]:
    if not isinstance(v, str):
        raise AnswerError("Please enter some text")
    limit = q.config.get("max_length")
    if limit and len(v) > limit:
        raise AnswerError(f"Please keep it under {limit} characters")
    return [(None, v.strip())]


def _email(q: Question, v: Any) -> list[Row]:
    if not isinstance(v, str) or not EMAIL_RE.match(v.strip()):
        raise AnswerError("Hmm... that email doesn't look right")
    return [(None, v.strip())]


def _number(q: Question, v: Any) -> list[Row]:
    try:
        n = float(v)
    except (TypeError, ValueError):
        raise AnswerError("Hmm... that doesn't look like a number") from None
    lo, hi = q.config.get("min"), q.config.get("max")
    if lo is not None and n < lo:
        raise AnswerError(f"Please enter a number greater than or equal to {lo:g}")
    if hi is not None and n > hi:
        raise AnswerError(f"Please enter a number less than or equal to {hi:g}")
    return [(None, f"{n:g}")]


def _yes_no(q: Question, v: Any) -> list[Row]:
    if v not in ("yes", "no"):
        raise AnswerError("Please choose yes or no")
    return [(None, v)]


def _rating(q: Question, v: Any) -> list[Row]:
    steps = q.config.get("steps", 5)
    if not isinstance(v, int) or isinstance(v, bool) or not 1 <= v <= steps:
        raise AnswerError(f"Please choose a rating from 1 to {steps}")
    return [(None, str(v))]


def _option_ids(q: Question) -> set[int]:
    return {o.id for o in q.options if o.deleted_at is None}


def _dropdown(q: Question, v: Any) -> list[Row]:
    if v not in _option_ids(q):
        raise AnswerError("Please select an option from the list")
    return [(v, None)]


def _multiple_choice(q: Question, v: Any) -> list[Row]:
    ids = v if isinstance(v, list) else [v]
    if not ids or not set(ids) <= _option_ids(q) or len(set(ids)) != len(ids):
        raise AnswerError("Please select a valid option")
    if not q.config.get("multiple") and len(ids) > 1:
        raise AnswerError("Please select only one option")
    limit = q.config.get("max_selections")
    if limit and len(ids) > limit:
        raise AnswerError(f"Please select up to {limit} options")
    return [(i, None) for i in ids]


def _file(q: Question, v: Any) -> list[Row]:
    if not isinstance(v, str) or not re.fullmatch(r"[0-9a-f]{32}/[^/\\]{1,200}", v):
        raise AnswerError("Please upload a file")
    return [(None, v)]


VALIDATORS: dict[str, Callable[[Question, Any], list[Row]]] = {
    "short_text": _text,
    "long_text": _text,
    "email": _email,
    "number": _number,
    "yes_no": _yes_no,
    "rating": _rating,
    "dropdown": _dropdown,
    "multiple_choice": _multiple_choice,
    "file_upload": _file,
}


def validate_answer(q: Question, value: Any) -> list[Row]:
    if is_empty(value):
        if q.required:
            raise AnswerError("Please fill this in")
        return []
    return VALIDATORS[q.type](q, value)
