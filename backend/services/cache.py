"""
Shared in-memory TTL cache for GitHub data and diagram results.
Prevents redundant API calls across routes for the same repo.
"""
import time
from typing import Any, Optional

_store: dict[str, tuple[Any, float]] = {}

GITHUB_TTL  = 5 * 60   # 5 minutes  — repo meta / file tree / readme
DIAGRAM_TTL = 30 * 60  # 30 minutes — generated diagram JSON


def _key(namespace: str, owner: str, repo: str) -> str:
    return f"{namespace}:{owner}/{repo}"


def get(namespace: str, owner: str, repo: str) -> Optional[Any]:
    k = _key(namespace, owner, repo)
    entry = _store.get(k)
    if entry is None:
        return None
    value, expires_at = entry
    if time.monotonic() > expires_at:
        del _store[k]
        return None
    return value


def set(namespace: str, owner: str, repo: str, value: Any, ttl: float) -> None:  # noqa: A001
    _store[_key(namespace, owner, repo)] = (value, time.monotonic() + ttl)


def delete(namespace: str, owner: str, repo: str) -> None:
    _store.pop(_key(namespace, owner, repo), None)


def delete_all(owner: str, repo: str) -> None:
    prefix = f":{owner}/{repo}"
    keys = [k for k in _store if k.endswith(prefix)]
    for k in keys:
        del _store[k]
