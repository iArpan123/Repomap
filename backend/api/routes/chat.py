from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from services import github_service
from services.analyzer import analyze_tree, build_dependency_graph
from services.chat_service import build_repo_context, stream_chat
import asyncio

router = APIRouter()


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    owner: str
    repo: str
    message: str
    history: list[ChatMessage] = []


# In-memory context cache keyed by "owner/repo"
_context_cache: dict[str, str] = {}


async def _get_or_build_context(owner: str, repo: str) -> str:
    key = f"{owner}/{repo}"
    if key in _context_cache:
        return _context_cache[key]

    meta = await github_service.get_repo_meta(owner, repo)
    files = await github_service.get_file_tree(owner, repo, meta["default_branch"])
    analysis = analyze_tree(files)

    # Fetch file contents concurrently (cap at 80 files, skip large ones)
    target_files = [f for f in files if f.get("size", 0) < 50_000][:80]
    tasks = [
        github_service.get_file_content(owner, repo, f["path"], meta["default_branch"])
        for f in target_files
    ]
    results = await asyncio.gather(*tasks)
    contents: dict[str, Optional[str]] = {
        f["path"]: content for f, content in zip(target_files, results)
    }

    readme = await github_service.get_readme(owner, repo)
    context = build_repo_context(meta, analysis, files, contents, readme)
    _context_cache[key] = context
    return context


@router.post("/message")
async def chat_message(body: ChatRequest):
    try:
        context = await _get_or_build_context(body.owner, body.repo)
        history = [{"role": m.role, "content": m.content} for m in body.history]

        async def event_stream():
            async for chunk in stream_chat(context, history, body.message):
                yield chunk

        return StreamingResponse(event_stream(), media_type="text/plain")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/context/{owner}/{repo}")
async def clear_context(owner: str, repo: str):
    key = f"{owner}/{repo}"
    _context_cache.pop(key, None)
    return {"cleared": key}
