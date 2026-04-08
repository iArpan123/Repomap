from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from services import github_service
from services.analyzer import analyze_tree
from services.chat_service import build_focused_context, stream_chat
from services import embedding_service, cache
import asyncio

router = APIRouter()


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    owner: str
    repo: str
    message: str
    history: list[ChatMessage] = []


def _user_token(request: Request):
    auth = request.headers.get("Authorization", "")
    return auth[7:] if auth.startswith("Bearer ") else None


async def _get_github_data(owner: str, repo: str, token=None) -> dict:
    cached = cache.get("github", owner, repo)
    if cached:
        return cached
    meta   = await github_service.get_repo_meta(owner, repo, token)
    files  = await github_service.get_file_tree(owner, repo, meta["default_branch"], token)
    readme = await github_service.get_readme(owner, repo, token)
    data   = {"meta": meta, "files": files, "readme": readme}
    cache.set("github", owner, repo, data, cache.GITHUB_TTL)
    return data


async def _get_file_contents(owner: str, repo: str, files: list, branch: str, token=None) -> dict:
    cached = cache.get("contents", owner, repo)
    if cached:
        return cached
    skip = {"test", "tests", "__pycache__", ".git", "node_modules", "dist", "build"}
    target = [
        f for f in files
        if not any(p in skip for p in f["path"].split("/"))
        and f.get("size", 0) < 50_000
    ][:60]
    results  = await asyncio.gather(*[
        github_service.get_file_content(owner, repo, f["path"], branch, token)
        for f in target
    ])
    contents = {f["path"]: c for f, c in zip(target, results)}
    cache.set("contents", owner, repo, contents, cache.GITHUB_TTL)
    return contents


async def _get_embeddings(owner: str, repo: str, contents: dict) -> dict:
    cached = cache.get("embeddings", owner, repo)
    if cached:
        return cached
    embedding_data = await embedding_service.embed_files(contents)
    cache.set("embeddings", owner, repo, embedding_data, cache.DIAGRAM_TTL)
    return embedding_data


@router.post("/message")
async def chat_message(body: ChatRequest, request: Request):
    try:
        token    = _user_token(request)
        github_data = await _get_github_data(body.owner, body.repo, token)
        meta, files, readme = github_data["meta"], github_data["files"], github_data["readme"]
        analysis = analyze_tree(files)

        contents       = await _get_file_contents(body.owner, body.repo, files, meta["default_branch"], token)
        embedding_data = await _get_embeddings(body.owner, body.repo, contents)
        relevant_paths = embedding_service.retrieve(body.message, embedding_data, top_k=8)
        context        = build_focused_context(meta, analysis, relevant_paths, contents, readme)
        history        = [{"role": m.role, "content": m.content} for m in body.history]

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
