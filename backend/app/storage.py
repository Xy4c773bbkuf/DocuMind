import re
from pathlib import Path
from uuid import uuid4


STORAGE_ROOT = Path(__file__).resolve().parent.parent / "storage"


def _safe_filename(filename: str) -> str:
    name = Path(filename).name
    return re.sub(r"[^A-Za-z0-9._-]", "_", name) or "document"


def save_file(user_id: int, filename: str, content: bytes) -> str:
    user_dir = STORAGE_ROOT / str(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)
    storage_key = f"{user_id}/{uuid4().hex}_{_safe_filename(filename)}"
    (STORAGE_ROOT / storage_key).write_bytes(content)
    return storage_key


def get_file(storage_key: str) -> Path | None:
    root = STORAGE_ROOT.resolve()
    path = (STORAGE_ROOT / storage_key).resolve()
    if root not in path.parents or not path.is_file():
        return None
    return path


def delete_file(storage_key: str | None) -> None:
    if not storage_key:
        return
    path = get_file(storage_key)
    if path:
        path.unlink(missing_ok=True)