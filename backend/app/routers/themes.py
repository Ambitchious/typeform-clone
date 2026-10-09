from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import schemas
from ..db import get_db
from ..services import themes as svc

router = APIRouter(prefix="/api/themes", tags=["themes"])


@router.get("", response_model=list[schemas.ThemeOut])
def list_themes(db: Session = Depends(get_db)):
    return svc.list_themes(db)


@router.post("", response_model=schemas.ThemeOut, status_code=201)
def create_theme(data: schemas.ThemeIn, db: Session = Depends(get_db)):
    return svc.create_theme(db, data)


@router.put("/{theme_id}", response_model=schemas.ThemeOut)
def update_theme(theme_id: int, data: schemas.ThemeIn, db: Session = Depends(get_db)):
    return svc.update_theme(db, theme_id, data)
