from typing import Any

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from ..models import Answer, Form, QuestionOption, Response
from .forms import live_questions

DONE = Response.status == "completed"


def performance(db: Session, form: Form) -> dict[str, Any]:
    starts, submissions = db.execute(
        select(func.count(), func.count().filter(DONE)).where(Response.form_id == form.id)
    ).one()
    avg_seconds = db.scalar(
        select(func.avg((func.julianday(Response.completed_at) - func.julianday(Response.started_at)) * 86400))
        .where(Response.form_id == form.id, DONE)
    )
    return {
        "views": form.view_count,
        "starts": starts,
        "submissions": submissions,
        "completion_rate": round(submissions / starts, 3) if starts else None,
        "avg_seconds": round(avg_seconds) if avg_seconds is not None else None,
    }


def question_summaries(db: Session, form: Form) -> list[dict[str, Any]]:
    total = db.scalar(select(func.count()).where(Response.form_id == form.id, DONE))
    completed = select(Response.id).where(Response.form_id == form.id, DONE)
    answered = dict(db.execute(
        select(Answer.question_id, func.count(func.distinct(Answer.response_id)))
        .where(Answer.response_id.in_(completed)).group_by(Answer.question_id)
    ).all())
    out = []
    for q in live_questions(form):
        item: dict[str, Any] = {"id": q.id, "type": q.type, "title": q.title, "answered": answered.get(q.id, 0), "total": total}
        mine = and_(Answer.question_id == q.id, Answer.response_id.in_(completed))
        if q.type in ("multiple_choice", "dropdown"):
            # LEFT JOIN from options so choices nobody picked still show with 0.
            rows = db.execute(
                select(QuestionOption.label, func.count(Answer.id))
                .outerjoin(Answer, and_(Answer.option_id == QuestionOption.id, mine))
                .where(QuestionOption.question_id == q.id, QuestionOption.deleted_at.is_(None))
                .group_by(QuestionOption.id).order_by(QuestionOption.position)
            ).all()
            item["counts"] = [{"label": label, "count": count} for label, count in rows]
        elif q.type in ("rating", "number", "yes_no"):
            rows = db.execute(select(Answer.value, func.count()).where(mine).group_by(Answer.value)).all()
            dist = {value: count for value, count in rows}
            if q.type == "yes_no":
                item["counts"] = [{"label": "Yes", "count": dist.get("yes", 0)}, {"label": "No", "count": dist.get("no", 0)}]
            else:
                n = sum(dist.values())
                item["average"] = round(sum(float(v) * c for v, c in dist.items()) / n, 2) if n else None
                if q.type == "rating":
                    item["counts"] = [{"label": str(s), "count": dist.get(str(s), 0)} for s in range(1, q.config.get("steps", 5) + 1)]
                else:
                    values = [float(v) for v in dist]
                    item["min"], item["max"] = (min(values), max(values)) if values else (None, None)
        else:
            item["latest"] = db.scalars(select(Answer.value).where(mine).order_by(Answer.id.desc()).limit(5)).all()
        out.append(item)
    return out
