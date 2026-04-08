from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from services import github_service
from services.diagram_service import generate_diagram
from services.analyzer import analyze_tree
from services import cache, embedding_service
import asyncio

router = APIRouter()


class DiagramRequest(BaseModel):
    owner: str
    repo: str
    force: bool = False


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


async def _build_embeddings_bg(owner: str, repo: str, contents: dict) -> None:
    if cache.get("embeddings", owner, repo):
        return
    try:
        embedding_data = await embedding_service.embed_files(contents)
        cache.set("embeddings", owner, repo, embedding_data, cache.DIAGRAM_TTL)
    except Exception:
        pass


@router.post("/generate")
async def generate_repo_diagram(body: DiagramRequest, request: Request):
    try:
        token = _user_token(request)

        if not body.force:
            cached_diagram = cache.get("diagram", body.owner, body.repo)
            if cached_diagram:
                return cached_diagram

        data  = await _get_github_data(body.owner, body.repo, token)
        meta  = data["meta"]
        files = data["files"]

        skip = {"test", "tests", "__pycache__", ".git", "node_modules", "dist", "build"}
        priority_files = [
            f for f in files
            if not any(part in skip for part in f["path"].split("/"))
            and f.get("size", 0) < 30_000
        ][:30]

        results  = await asyncio.gather(*[
            github_service.get_file_content(body.owner, body.repo, f["path"], meta["default_branch"], token)
            for f in priority_files
        ])
        contents = {f["path"]: c for f, c in zip(priority_files, results)}

        cache.set("contents", body.owner, body.repo, contents, cache.GITHUB_TTL)
        asyncio.create_task(_build_embeddings_bg(body.owner, body.repo, contents))

        diagram  = await generate_diagram(meta, files, contents, data["readme"])
        response = {"diagram": diagram, "meta": meta}
        cache.set("diagram", body.owner, body.repo, response, cache.DIAGRAM_TTL)
        return response

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
