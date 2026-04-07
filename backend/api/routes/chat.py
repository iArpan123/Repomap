from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from services import github_service
from services.analyzer import analyze_tree
from services.chat_service import build_repo_context, stream_chat
from services import cache
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


async def _get_or_build_context(owner: str, repo: str) -> str:
    # Check chat context cache first
    ctx = cache.get("chat_ctx", owner, repo)
    if ctx:
        return ctx

    # Re-use shared GitHub data cache
    github_data = cache.get("github", owner, repo)
    if github_data:
        meta, files, readme = github_data["meta"], github_data["files"], github_data["readme"]
    else:
        meta   = await github_service.get_repo_meta(owner, repo)
        files  = await github_service.get_file_tree(owner, repo, meta["default_branch"])
        readme = await github_service.get_readme(owner, repo)
        cache.set("github", owner, repo, {"meta": meta, "files": files, "readme": readme}, cache.GITHUB_TTL)

    analysis = analyze_tree(files)

    # Fetch file contents concurrently (skip test/build dirs, cap at 40)
    skip = {"test", "tests", "__pycache__", ".git", "node_modules", "dist", "build"}
    target_files = [
        f for f in files
        if not any(part in skip for part in f["path"].split("/"))
        and f.get("size", 0) < 50_000
    ][:40]

    results  = await asyncio.gather(*[
        github_service.get_file_content(owner, repo, f["path"], meta["default_branch"])
        for f in target_files
    ])
    contents: dict[str, Optional[str]] = {f["path"]: c for f, c in zip(target_files, results)}

    ctx = build_repo_context(meta, analysis, files, contents, readme)
    cache.set("chat_ctx", owner, repo, ctx, cache.GITHUB_TTL)
    return ctx


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
    cache.delete_all(owner, repo)
    return {"cleared": f"{owner}/{repo}"}
