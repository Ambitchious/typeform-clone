from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import schemas
from ..db import get_db
from ..models import Theme

router = APIRouter(prefix="/api/themes", tags=["themes"])


@router.get("", response_model=list[schemas.ThemeOut])
def list_themes(db: Session = Depends(get_db)):
    return db.scalars(select(Theme).order_by(Theme.is_gallery.desc(), Theme.id)).all()


@router.post("", response_model=schemas.ThemeOut, status_code=201)
def create_theme(data: schemas.ThemeIn, db: Session = Depends(get_db)):
    theme = Theme(**data.model_dump(), is_gallery=False)
    db.add(theme)
    db.commit()
    return theme


@router.put("/{theme_id}", response_model=schemas.ThemeOut)
def update_theme(theme_id: int, data: schemas.ThemeIn, db: Session = Depends(get_db)):
    theme = db.get(Theme, theme_id)
    if not theme:
        raise HTTPException(404, "Theme not found")
    if theme.is_gallery:
        raise HTTPException(403, "Gallery themes can't be edited — save a copy instead")
    for key, value in data.model_dump().items():
        setattr(theme, key, value)
    db.commit()
    return theme
