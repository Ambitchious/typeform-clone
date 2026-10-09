from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import schemas
from ..models import Theme


def list_themes(db: Session) -> list[Theme]:
    return list(db.scalars(select(Theme).order_by(Theme.is_gallery.desc(), Theme.id)))


def create_theme(db: Session, data: schemas.ThemeIn) -> Theme:
    theme = Theme(**data.model_dump(), is_gallery=False)
    db.add(theme)
    db.commit()
    return theme


def update_theme(db: Session, theme_id: int, data: schemas.ThemeIn) -> Theme:
    theme = db.get(Theme, theme_id)
    if not theme:
        raise HTTPException(404, "Theme not found")
    if theme.is_gallery:
        raise HTTPException(403, "Gallery themes can't be edited — save a copy instead")
    for key, value in data.model_dump().items():
        setattr(theme, key, value)
    db.commit()
    return theme
