from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response as HttpResponse
from sqlalchemy.orm import Session, selectinload

from .. import schemas
from ..db import get_db
from ..models import Answer, Response
from ..services import responses as svc
from ..services import sample, stats
from ..services.forms import get_form

router = APIRouter(prefix="/api/forms/{form_id}", tags=["results"])


@router.get("/responses", response_model=schemas.ResponsePage)
def list_responses(
    form_id: int,
    status: Literal["completed", "in_progress", "all"] = "completed",
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return svc.list_responses(db, get_form(db, form_id), status, page, size)


@router.get("/responses/export.csv")
def export_csv(form_id: int, db: Session = Depends(get_db)):
    form = get_form(db, form_id)
    # HTTP headers must be ASCII, so "Café Feedback" becomes "Caf--Feedback.csv".
    filename = "".join(c if c.isascii() and c.isalnum() else "-" for c in form.title).strip("-") or "responses"
    return HttpResponse(
        svc.to_csv(db, form), media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}.csv"'},
    )


@router.get("/responses/{response_id}", response_model=schemas.ResponseOut)
def get_response(form_id: int, response_id: int, db: Session = Depends(get_db)):
    response = db.get(Response, response_id, options=[selectinload(Response.answers).selectinload(Answer.question)])
    if not response or response.form_id != form_id:
        raise HTTPException(404, "Response not found")
    return svc.serialize(response)


@router.delete("/responses/{response_id}", status_code=204)
def delete_response(form_id: int, response_id: int, db: Session = Depends(get_db)):
    response = db.get(Response, response_id)
    if not response or response.form_id != form_id:
        raise HTTPException(404, "Response not found")
    db.delete(response)
    db.commit()
    return HttpResponse(status_code=204)


@router.post("/responses/generate", status_code=201)
def generate_test_response(form_id: int, db: Session = Depends(get_db)):
    return {"id": sample.generate_response(db, get_form(db, form_id)).id}


@router.get("/summary")
def summary(form_id: int, db: Session = Depends(get_db)):
    form = get_form(db, form_id)
    return {"performance": stats.performance(db, form), "questions": stats.question_summaries(db, form)}
