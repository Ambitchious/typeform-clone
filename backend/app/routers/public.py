"""Routes for anonymous respondents. Everything here only ever reads published forms."""

from typing import Any

from fastapi import APIRouter, Depends, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import schemas
from ..db import get_db
from ..services import responses as svc
from ..services import uploads

router = APIRouter(prefix="/api/public", tags=["respondent"])


@router.get("/forms/{slug}", response_model=schemas.PublicForm)
def get_form(slug: str, db: Session = Depends(get_db)):
    return svc.public_form(svc.get_published(db, slug))


@router.post("/forms/{slug}/view", status_code=204)
def count_view(slug: str, db: Session = Depends(get_db)):
    svc.count_view(db, svc.get_published(db, slug))


@router.post("/forms/{slug}/responses/start", response_model=schemas.StartOut, status_code=201)
def start(slug: str, db: Session = Depends(get_db)):
    response = svc.start(db, svc.get_published(db, slug))
    return schemas.StartOut(response_id=response.id, token=response.token)


class PartialIn(BaseModel):
    token: str
    value: Any = None


@router.put("/forms/{slug}/responses/{response_id}/answers/{question_id}", status_code=204)
def save_answer(slug: str, response_id: int, question_id: int, data: PartialIn, db: Session = Depends(get_db)):
    form = svc.get_published(db, slug)
    svc.save_partial(db, svc.by_token(db, form, response_id, data.token), svc.live_question(form, question_id), data.value)


class SubmitIn(schemas.AnswersIn):
    response_id: int | None = None
    token: str | None = None


@router.post("/forms/{slug}/responses", status_code=201)
def submit(slug: str, data: SubmitIn, db: Session = Depends(get_db)):
    form = svc.get_published(db, slug)
    existing = svc.by_token(db, form, data.response_id, data.token) if data.response_id and data.token else None
    return {"id": svc.submit(db, form, existing, data.answers).id}


@router.post("/forms/{slug}/uploads", status_code=201)
async def upload(slug: str, file: UploadFile, db: Session = Depends(get_db)):
    svc.get_published(db, slug)
    return await uploads.save(file)


files = APIRouter(prefix="/api/files", tags=["files"])


@files.get("/{folder}/{name}")
def download(folder: str, name: str):
    return FileResponse(uploads.path_for(folder, name), filename=name)
