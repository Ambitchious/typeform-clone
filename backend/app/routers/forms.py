from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from .. import schemas
from ..db import get_db
from ..services import forms as svc

router = APIRouter(prefix="/api", tags=["creator"])


@router.get("/forms", response_model=list[schemas.FormSummary])
def list_forms(db: Session = Depends(get_db)):
    return svc.list_forms(db)


@router.post("/forms", response_model=schemas.FormDetail, status_code=201)
def create_form(data: schemas.FormCreate, db: Session = Depends(get_db)):
    return svc.detail(db, svc.create_form(db, data.title))


@router.get("/forms/{form_id}", response_model=schemas.FormDetail)
def get_form(form_id: int, db: Session = Depends(get_db)):
    return svc.detail(db, svc.get_form(db, form_id))


@router.patch("/forms/{form_id}", response_model=schemas.FormDetail)
def update_form(form_id: int, data: schemas.FormUpdate, db: Session = Depends(get_db)):
    return svc.detail(db, svc.update_form(db, svc.get_form(db, form_id), data))


@router.delete("/forms/{form_id}", status_code=204)
def delete_form(form_id: int, db: Session = Depends(get_db)):
    svc.delete_form(db, svc.get_form(db, form_id))
    return Response(status_code=204)


@router.post("/forms/{form_id}/duplicate", response_model=schemas.FormDetail, status_code=201)
def duplicate_form(form_id: int, db: Session = Depends(get_db)):
    return svc.detail(db, svc.duplicate_form(db, svc.get_form(db, form_id)))


@router.post("/forms/{form_id}/publish", response_model=schemas.FormDetail)
def publish(form_id: int, db: Session = Depends(get_db)):
    return svc.detail(db, svc.publish(db, svc.get_form(db, form_id)))


@router.post("/forms/{form_id}/unpublish", response_model=schemas.FormDetail)
def unpublish(form_id: int, db: Session = Depends(get_db)):
    return svc.detail(db, svc.unpublish(db, svc.get_form(db, form_id)))


@router.post("/forms/{form_id}/questions", response_model=schemas.QuestionOut, status_code=201)
def add_question(form_id: int, data: schemas.QuestionCreate, db: Session = Depends(get_db)):
    return svc.serialize_question(svc.add_question(db, svc.get_form(db, form_id), data))


@router.put("/forms/{form_id}/questions/order", status_code=204)
def reorder(form_id: int, data: schemas.ReorderIn, db: Session = Depends(get_db)):
    svc.reorder(db, svc.get_form(db, form_id), data.question_ids)
    return Response(status_code=204)


@router.patch("/questions/{question_id}", response_model=schemas.QuestionOut)
def update_question(question_id: int, data: schemas.QuestionUpdate, db: Session = Depends(get_db)):
    return svc.serialize_question(svc.update_question(db, svc.get_question(db, question_id), data))


@router.delete("/questions/{question_id}", status_code=204)
def delete_question(question_id: int, db: Session = Depends(get_db)):
    svc.delete_question(db, svc.get_question(db, question_id))
    return Response(status_code=204)
