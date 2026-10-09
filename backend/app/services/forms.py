import secrets

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import schemas
from ..models import CHOICE_TYPES, Answer, Form, LogicRule, Question, QuestionOption, Response, Theme, now

DEFAULT_CONFIG = {
    "rating": {"steps": 5, "shape": "star"},
    "multiple_choice": {"multiple": False},
}
DEFAULT_OPTIONS = {"multiple_choice": ["Choice 1", "Choice 2"], "dropdown": []}
DEFAULT_SETTINGS = {
    "welcome": {"enabled": True, "title": "", "description": "", "button": "Start", "show_time": True},
    "thank_you": {"title": "Thanks for completing this typeform", "description": "Now create your own — it's free, easy & beautiful", "button": ""},
    "show_progress": True,
    "show_numbers": True,
    "letters_on_answers": True,
    "navigation_arrows": True,
}


def get_form(db: Session, form_id: int) -> Form:
    form = db.get(Form, form_id)
    if not form:
        raise HTTPException(404, "Form not found")
    return form


def get_question(db: Session, question_id: int) -> Question:
    q = db.get(Question, question_id)
    if not q or q.deleted_at:
        raise HTTPException(404, "Question not found")
    return q


def live_questions(form: Form) -> list[Question]:
    return [q for q in form.questions if q.deleted_at is None]


def response_counts(db: Session, form_ids: list[int]) -> dict[int, tuple[int, int]]:
    """form_id -> (completed responses, started responses) in one grouped query."""
    rows = db.execute(
        select(
            Response.form_id,
            func.count().filter(Response.status == "completed"),
            func.count(),
        ).where(Response.form_id.in_(form_ids)).group_by(Response.form_id)
    ).all()
    return {fid: (done, started) for fid, done, started in rows}


def list_forms(db: Session) -> list[schemas.FormSummary]:
    return summarize(db, list(db.scalars(select(Form).order_by(Form.updated_at.desc()))))


def summarize(db: Session, forms: list[Form]) -> list[schemas.FormSummary]:
    counts = response_counts(db, [f.id for f in forms])
    return [
        schemas.FormSummary.model_validate(f).model_copy(
            update={"response_count": counts.get(f.id, (0, 0))[0], "started_count": counts.get(f.id, (0, 0))[1]}
        )
        for f in forms
    ]


def serialize_question(q: Question, answer_count: int = 0) -> schemas.QuestionOut:
    out = schemas.QuestionOut.model_validate(q)
    out.options = [schemas.OptionOut.model_validate(o) for o in q.options if o.deleted_at is None]
    out.answer_count = answer_count
    return out


def detail(db: Session, form: Form) -> schemas.FormDetail:
    answered = dict(db.execute(
        select(Answer.question_id, func.count(func.distinct(Answer.response_id)))
        .join(Question).where(Question.form_id == form.id).group_by(Answer.question_id)
    ).all())
    base = summarize(db, [form])[0]
    return schemas.FormDetail(
        **base.model_dump(),
        settings=form.settings,
        view_count=form.view_count,
        questions=[serialize_question(q, answered.get(q.id, 0)) for q in live_questions(form)],
    )


def create_form(db: Session, title: str) -> Form:
    theme = db.scalar(select(Theme).where(Theme.is_gallery).order_by(Theme.id))
    # Like Typeform, a new form starts without a welcome screen ("Add Welcome Screen" turns it on).
    settings = {**DEFAULT_SETTINGS, "welcome": {**DEFAULT_SETTINGS["welcome"], "enabled": False}}
    form = Form(title=title, theme=theme, settings=settings)
    db.add(form)
    db.commit()
    return form


def update_form(db: Session, form: Form, data: schemas.FormUpdate) -> Form:
    fields = data.model_dump(exclude_unset=True)
    if "theme_id" in fields and not db.get(Theme, fields["theme_id"]):
        raise HTTPException(422, "Unknown theme")
    if "settings" in fields:
        fields["settings"] = {**form.settings, **fields["settings"]}
    for key, value in fields.items():
        setattr(form, key, value)
    db.commit()
    return form


def delete_form(db: Session, form: Form) -> None:
    db.delete(form)
    db.commit()


def duplicate_form(db: Session, source: Form) -> Form:
    copy = Form(title=f"{source.title} (copy)", theme_id=source.theme_id, settings=source.settings)
    id_map, option_map = {}, {}
    for q in live_questions(source):
        new_q = Question(type=q.type, title=q.title, description=q.description, required=q.required,
                         position=q.position, config=q.config)
        for o in q.options:
            if o.deleted_at is None:
                new_o = QuestionOption(label=o.label, position=o.position)
                new_q.options.append(new_o)
                option_map[o.id] = new_o
        copy.questions.append(new_q)
        id_map[q.id] = new_q
    db.add(copy)
    db.flush()
    # Logic rules point at question/option ids, so they are remapped after the copies have ids.
    for old_id, new_q in id_map.items():
        for r in db.get(Question, old_id).logic_rules:
            if r.jump_to_question_id is not None and r.jump_to_question_id not in id_map:
                continue
            new_q.logic_rules.append(LogicRule(
                operator=r.operator, value=r.value, position=r.position,
                option_id=option_map[r.option_id].id if r.option_id in option_map else None,
                jump_to_question_id=id_map[r.jump_to_question_id].id if r.jump_to_question_id else None,
            ))
    db.commit()
    return copy


def publish(db: Session, form: Form) -> Form:
    if not live_questions(form):
        raise HTTPException(400, "Add at least one question before publishing")
    if not form.slug:
        form.slug = secrets.token_urlsafe(6)
    form.status = "published"
    db.commit()
    return form


def unpublish(db: Session, form: Form) -> Form:
    form.status = "draft"
    db.commit()
    return form


def add_question(db: Session, form: Form, data: schemas.QuestionCreate) -> Question:
    questions = live_questions(form)
    index = len(questions)
    if data.after_question_id is not None:
        index = next((i + 1 for i, q in enumerate(questions) if q.id == data.after_question_id), index)
    q = Question(type=data.type, title=data.title, position=0, config=dict(DEFAULT_CONFIG.get(data.type, {})))
    q.options = [QuestionOption(label=label, position=i) for i, label in enumerate(DEFAULT_OPTIONS.get(data.type, []))]
    questions.insert(index, q)
    form.questions.append(q)
    for i, item in enumerate(questions):
        item.position = i
    form.updated_at = now()
    db.commit()
    return q


def sync_options(q: Question, incoming: list[schemas.OptionIn]) -> None:
    """Diff by id: update kept options, create new ones, soft-delete removed ones.
    Matching by id (not label) means renaming an option keeps every old answer attached to it."""
    current = {o.id: o for o in q.options if o.deleted_at is None}
    keep = set()
    for position, item in enumerate(incoming):
        if item.id in current:
            current[item.id].label, current[item.id].position = item.label, position
            keep.add(item.id)
        else:
            q.options.append(QuestionOption(label=item.label, position=position))
    for option_id, option in current.items():
        if option_id not in keep:
            option.deleted_at = now()


def update_question(db: Session, q: Question, data: schemas.QuestionUpdate) -> Question:
    fields = data.model_dump(exclude_unset=True, exclude={"options", "logic_rules"})
    if "type" in fields and fields["type"] != q.type:
        q.config = dict(DEFAULT_CONFIG.get(fields["type"], {}))
        q.logic_rules = []
        if fields["type"] in CHOICE_TYPES and not any(o.deleted_at is None for o in q.options):
            sync_options(q, [schemas.OptionIn(label=l) for l in DEFAULT_OPTIONS[fields["type"]]])
    for key, value in fields.items():
        setattr(q, key, value)
    if data.options is not None:
        sync_options(q, data.options)
    if data.logic_rules is not None:
        set_logic(q, data.logic_rules)
    q.form.updated_at = now()
    db.commit()
    db.refresh(q)
    return q


def set_logic(q: Question, rules: list[schemas.LogicRuleIn]) -> None:
    later = {other.id for other in live_questions(q.form) if other.position > q.position}
    options = {o.id for o in q.options if o.deleted_at is None}
    for r in rules:
        if r.jump_to_question_id is not None and r.jump_to_question_id not in later:
            raise HTTPException(422, "Logic can only jump forward to a later question")
        if r.option_id is not None and r.option_id not in options:
            raise HTTPException(422, "Logic refers to an option this question doesn't have")
    q.logic_rules = [LogicRule(position=i, **r.model_dump()) for i, r in enumerate(rules)]


def delete_question(db: Session, q: Question) -> None:
    has_answers = db.scalar(select(func.count()).select_from(Answer).where(Answer.question_id == q.id))
    form = q.form
    if has_answers:
        q.deleted_at = now()
    else:
        db.delete(q)
    db.flush()
    for i, item in enumerate(live_questions(form)):
        item.position = i
    # Rules elsewhere that jumped to this question would now point at nothing visible.
    for rule in db.scalars(select(LogicRule).where(LogicRule.jump_to_question_id == q.id)):
        db.delete(rule)
    form.updated_at = now()
    db.commit()


def reorder(db: Session, form: Form, question_ids: list[int]) -> None:
    questions = {q.id: q for q in live_questions(form)}
    if sorted(question_ids) != sorted(questions):
        raise HTTPException(409, "The question list changed — refresh and try again")
    for position, qid in enumerate(question_ids):
        questions[qid].position = position
    # A reorder can turn a forward jump into a backward one; drop those rules.
    for q in questions.values():
        q.logic_rules = [
            r for r in q.logic_rules
            if r.jump_to_question_id is None
            or (r.jump_to_question_id in questions and questions[r.jump_to_question_id].position > q.position)
        ]
    form.updated_at = now()
    db.commit()
