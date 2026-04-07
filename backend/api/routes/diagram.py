from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services import github_service
from services.diagram_service import generate_diagram
from services.analyzer import analyze_tree
from services import cache
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

        diagram  = await generate_diagram(meta, files, contents, data["readme"])
        response = {"diagram": diagram, "meta": meta}
        cache.set("diagram", body.owner, body.repo, response, cache.DIAGRAM_TTL)
        return response

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
