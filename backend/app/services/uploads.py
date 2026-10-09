"""File-upload answers: stored on disk under a random folder, so keys can't be guessed."""

import os
import re
import secrets
from pathlib import Path

from fastapi import HTTPException, UploadFile

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
MAX_UPLOAD = 10 * 1024 * 1024


async def save(file: UploadFile) -> dict:
    content = await file.read(MAX_UPLOAD + 1)
    if len(content) > MAX_UPLOAD:
        raise HTTPException(413, "File is too large (10MB max)")
    # Keep only safe characters: the name ends up in a filesystem path and a download header.
    name = re.sub(r"[^\w.\- ]", "_", Path(file.filename or "file").name)[:120] or "file"
    key = f"{secrets.token_hex(16)}/{name}"
    (UPLOAD_DIR / key).parent.mkdir(parents=True, exist_ok=True)
    (UPLOAD_DIR / key).write_bytes(content)
    return {"key": key, "name": name, "size": len(content)}


def path_for(folder: str, name: str) -> Path:
    path = (UPLOAD_DIR / folder / name).resolve()
    if not re.fullmatch(r"[0-9a-f]{32}", folder) or UPLOAD_DIR.resolve() not in path.parents or not path.is_file():
        raise HTTPException(404, "File not found")
    return path
