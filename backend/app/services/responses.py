import csv
import io
import secrets
from typing import Any

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from .. import schemas
from ..logic import visible_path
from ..models import Answer, Form, Question, Response, now
from ..validators import AnswerError, validate_answer
from .forms import live_questions, serialize_question


def get_published(db: Session, slug: str) -> Form:
    form = db.scalar(select(Form).where(Form.slug == slug, Form.status == "published"))
    if not form:
        # Same 404 for "missing" and "draft", so outsiders can't probe for unpublished forms.
        raise HTTPException(404, "This typeform isn't accepting responses")
    return form


def public_form(form: Form) -> schemas.PublicForm:
    return schemas.PublicForm(
        title=form.title, slug=form.slug, theme=form.theme, settings=form.settings,
        questions=[serialize_question(q) for q in live_questions(form)],
    )


def count_view(db: Session, form: Form) -> None:
    form.view_count += 1
    db.commit()


def live_question(form: Form, question_id: int) -> Question:
    question = next((q for q in live_questions(form) if q.id == question_id), None)
    if not question:
        raise HTTPException(404, "Question not found")
    return question


def start(db: Session, form: Form) -> Response:
    response = Response(form=form, token=secrets.token_hex(16))
    db.add(response)
    db.commit()
    return response


def by_token(db: Session, form: Form, response_id: int, token: str) -> Response:
    response = db.get(Response, response_id)
    # The token proves the caller started this response; ids alone are guessable.
    if not response or response.form_id != form.id or not secrets.compare_digest(response.token, token):
        raise HTTPException(404, "Response not found")
    if response.status == "completed":
        raise HTTPException(409, "This response was already submitted")
    return response


def _store(db: Session, response: Response, q: Question, rows: list[tuple[int | None, str | None]]) -> None:
    for old in [a for a in response.answers if a.question_id == q.id]:
        response.answers.remove(old)
    # Flush the deletes first: SQLAlchemy would otherwise INSERT the replacement before DELETing
    # the old row and trip UNIQUE(response_id, question_id, option_id) for the same choice.
    db.flush()
    response.answers.extend(Answer(question_id=q.id, option_id=o, value=v) for o, v in rows)


def save_partial(db: Session, response: Response, q: Question, value: Any) -> None:
    """Autosave of one answer while the respondent is still filling the form.
    Format is checked now; 'required' is only enforced at submit."""
    try:
        rows = [] if value in (None, "", []) else validate_answer(q, value)
    except AnswerError as e:
        raise HTTPException(422, {"errors": {str(q.id): str(e)}}) from None
    _store(db, response, q, rows)
    db.commit()


def submit(db: Session, form: Form, response: Response | None, raw: dict[str, Any]) -> Response:
    questions = live_questions(form)
    answers = {q.id: raw.get(str(q.id)) for q in questions}
    errors: dict[str, str] = {}
    validated = {}
    # Only questions on the respondent's logic path are checked, so a required question
    # hidden by a jump never blocks submission.
    for q in visible_path(questions, answers):
        try:
            validated[q.id] = (q, validate_answer(q, answers[q.id]))
        except AnswerError as e:
            errors[str(q.id)] = str(e)
    if errors:
        raise HTTPException(422, {"errors": errors})

    response = response or Response(form=form, token=secrets.token_hex(16))
    db.add(response)
    for q in questions:  # also clears partial answers to questions the final path skipped
        _store(db, response, q, validated[q.id][1] if q.id in validated else [])
    response.status, response.completed_at = "completed", now()
    db.commit()
    return response


def display_value(q: Question, answers: list[Answer]) -> Any:
    if q.type == "multiple_choice":
        return [a.option.label for a in answers if a.option]
    if q.type == "dropdown":
        return answers[0].option.label if answers[0].option else None
    if q.type in ("number", "rating"):
        return float(answers[0].value) if "." in answers[0].value else int(answers[0].value)
    return answers[0].value


def serialize(response: Response) -> schemas.ResponseOut:
    grouped: dict[int, list[Answer]] = {}
    for a in response.answers:
        grouped.setdefault(a.question_id, []).append(a)
    ordered = sorted(grouped.values(), key=lambda rows: rows[0].question.position)
    return schemas.ResponseOut(
        id=response.id, status=response.status,
        started_at=response.started_at, completed_at=response.completed_at,
        answers=[
            schemas.AnswerOut(question_id=rows[0].question_id, question_title=rows[0].question.title,
                              question_type=rows[0].question.type, value=display_value(rows[0].question, rows))
            for rows in ordered
        ],
    )


def get_response(db: Session, form: Form, response_id: int) -> Response:
    response = db.get(Response, response_id, options=[selectinload(Response.answers).selectinload(Answer.question)])
    if not response or response.form_id != form.id:
        raise HTTPException(404, "Response not found")
    return response


def delete_response(db: Session, form: Form, response_id: int) -> None:
    db.delete(get_response(db, form, response_id))
    db.commit()


def list_responses(db: Session, form: Form, status: str, page: int, size: int) -> schemas.ResponsePage:
    where = [Response.form_id == form.id] + ([Response.status == status] if status != "all" else [])
    total = db.scalar(select(func.count()).select_from(Response).where(*where))
    rows = db.scalars(
        select(Response).where(*where)
        .options(selectinload(Response.answers).selectinload(Answer.question),
                 selectinload(Response.answers).selectinload(Answer.option))
        .order_by(Response.started_at.desc()).offset((page - 1) * size).limit(size)
    ).all()
    return schemas.ResponsePage(total=total, items=[serialize(r) for r in rows])


def to_csv(db: Session, form: Form) -> str:
    questions = [q for q in form.questions if q.deleted_at is None]
    page = list_responses(db, form, "completed", 1, 100_000)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Response ID", "Submitted at", *[q.title or "Untitled" for q in questions]])
    for r in page.items:
        values = {a.question_id: a.value for a in r.answers}
        cells = [", ".join(v) if isinstance(v, list) else v for v in (values.get(q.id, "") for q in questions)]
        # A leading = + - @ makes spreadsheets run the cell as a formula (CSV injection).
        cells = [f"'{c}" if isinstance(c, str) and c[:1] in "=+-@" else c for c in cells]
        writer.writerow([r.id, r.completed_at.isoformat() if r.completed_at else "", *cells])
    return buffer.getvalue()
