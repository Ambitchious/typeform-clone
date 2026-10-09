"""Routes for anonymous respondents. Everything here only ever reads published forms."""

import os
import re
import secrets
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import schemas
from ..db import get_db
from ..models import Form
from ..services import forms as forms_svc
from ..services import responses as svc

router = APIRouter(prefix="/api/public", tags=["respondent"])

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
MAX_UPLOAD = 10 * 1024 * 1024


def published(db: Session, slug: str) -> Form:
    form = db.scalar(select(Form).where(Form.slug == slug, Form.status == "published"))
    if not form:
        # Same 404 for "missing" and "draft", so outsiders can't probe for unpublished forms.
        raise HTTPException(404, "This typeform isn't accepting responses")
    return form


@router.get("/forms/{slug}", response_model=schemas.PublicForm)
def get_form(slug: str, db: Session = Depends(get_db)):
    form = published(db, slug)
    return schemas.PublicForm(
        title=form.title, slug=form.slug, theme=form.theme, settings=form.settings,
        questions=[forms_svc.serialize_question(q) for q in forms_svc.live_questions(form)],
    )


@router.post("/forms/{slug}/view", status_code=204)
def count_view(slug: str, db: Session = Depends(get_db)):
    published(db, slug).view_count += 1
    db.commit()


@router.post("/forms/{slug}/responses/start", response_model=schemas.StartOut, status_code=201)
def start(slug: str, db: Session = Depends(get_db)):
    response = svc.start(db, published(db, slug))
    return schemas.StartOut(response_id=response.id, token=response.token)


class PartialIn(BaseModel):
    token: str
    value: Any = None


@router.put("/forms/{slug}/responses/{response_id}/answers/{question_id}", status_code=204)
def save_answer(slug: str, response_id: int, question_id: int, data: PartialIn, db: Session = Depends(get_db)):
    form = published(db, slug)
    response = svc.by_token(db, form, response_id, data.token)
    question = next((q for q in forms_svc.live_questions(form) if q.id == question_id), None)
    if not question:
        raise HTTPException(404, "Question not found")
    svc.save_partial(db, response, question, data.value)


class SubmitIn(schemas.AnswersIn):
    response_id: int | None = None
    token: str | None = None


@router.post("/forms/{slug}/responses", status_code=201)
def submit(slug: str, data: SubmitIn, db: Session = Depends(get_db)):
    form = published(db, slug)
    existing = svc.by_token(db, form, data.response_id, data.token) if data.response_id and data.token else None
    return {"id": svc.submit(db, form, existing, data.answers).id}


@router.post("/forms/{slug}/uploads", status_code=201)
async def upload(slug: str, file: UploadFile, db: Session = Depends(get_db)):
    published(db, slug)
    content = await file.read(MAX_UPLOAD + 1)
    if len(content) > MAX_UPLOAD:
        raise HTTPException(413, "File is too large (10MB max)")
    # Keep only safe characters: the name ends up in a filesystem path and a download header.
    name = re.sub(r"[^\w.\- ]", "_", Path(file.filename or "file").name)[:120] or "file"
    key = f"{secrets.token_hex(16)}/{name}"
    (UPLOAD_DIR / key).parent.mkdir(parents=True, exist_ok=True)
    (UPLOAD_DIR / key).write_bytes(content)
    return {"key": key, "name": name, "size": len(content)}


files = APIRouter(prefix="/api/files", tags=["files"])


@files.get("/{folder}/{name}")
def download(folder: str, name: str):
    path = (UPLOAD_DIR / folder / name).resolve()
    if not re.fullmatch(r"[0-9a-f]{32}", folder) or UPLOAD_DIR.resolve() not in path.parents or not path.is_file():
        raise HTTPException(404, "File not found")
    return FileResponse(path, filename=name)
