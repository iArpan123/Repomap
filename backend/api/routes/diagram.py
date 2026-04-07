from fastapi import APIRouter, HTTPException
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
    force: bool = False   # pass true to bypass diagram cache


async def _get_github_data(owner: str, repo: str) -> dict:
    """Re-use cached GitHub data if available (shared with repo route)."""
    cached = cache.get("github", owner, repo)
    if cached:
        return cached

    meta   = await github_service.get_repo_meta(owner, repo)
    files  = await github_service.get_file_tree(owner, repo, meta["default_branch"])
    readme = await github_service.get_readme(owner, repo)
    data   = {"meta": meta, "files": files, "readme": readme}
    cache.set("github", owner, repo, data, cache.GITHUB_TTL)
    return data


async def _build_embeddings_bg(owner: str, repo: str, contents: dict) -> None:
    """Fire-and-forget: build embedding index while diagram is generating."""
    if cache.get("embeddings", owner, repo):
        return  # already cached, nothing to do
    try:
        embedding_data = await embedding_service.embed_files(contents)
        cache.set("embeddings", owner, repo, embedding_data, cache.DIAGRAM_TTL)
    except Exception:
        pass  # non-critical — chat route will rebuild if missing


@router.post("/generate")
async def generate_repo_diagram(body: DiagramRequest):
    try:
        # Return cached diagram unless caller forces regeneration
        if not body.force:
            cached_diagram = cache.get("diagram", body.owner, body.repo)
            if cached_diagram:
                return cached_diagram

        data  = await _get_github_data(body.owner, body.repo)
        meta  = data["meta"]
        files = data["files"]

        # Fetch contents for key files concurrently (skip test files, cap at 30)
        skip = {"test", "tests", "__pycache__", ".git", "node_modules", "dist", "build"}
        priority_files = [
            f for f in files
            if not any(part in skip for part in f["path"].split("/"))
            and f.get("size", 0) < 30_000
        ][:30]

        tasks   = [
            github_service.get_file_content(body.owner, body.repo, f["path"], meta["default_branch"])
            for f in priority_files
        ]
        results  = await asyncio.gather(*tasks)
        contents = {f["path"]: c for f, c in zip(priority_files, results)}

        # Cache contents so chat route can reuse them without re-fetching
        cache.set("contents", body.owner, body.repo, contents, cache.GITHUB_TTL)

        # Build embeddings in the background — ready before user opens chat
        asyncio.create_task(_build_embeddings_bg(body.owner, body.repo, contents))

        diagram  = await generate_diagram(meta, files, contents, data["readme"])
        response = {"diagram": diagram, "meta": meta}
        cache.set("diagram", body.owner, body.repo, response, cache.DIAGRAM_TTL)
        return response

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
