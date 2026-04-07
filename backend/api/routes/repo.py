from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services import github_service
from services.analyzer import analyze_tree
from services import cache

router = APIRouter()


class RepoRequest(BaseModel):
    owner: str
    repo: str


async def _get_github_data(owner: str, repo: str) -> dict:
    """Fetch and cache repo meta + file tree + readme."""
    cached = cache.get("github", owner, repo)
    if cached:
        return cached

    meta   = await github_service.get_repo_meta(owner, repo)
    files  = await github_service.get_file_tree(owner, repo, meta["default_branch"])
    readme = await github_service.get_readme(owner, repo)
    data   = {"meta": meta, "files": files, "readme": readme}
    cache.set("github", owner, repo, data, cache.GITHUB_TTL)
    return data


@router.post("/analyze")
async def analyze_repo(body: RepoRequest):
    try:
        data     = await _get_github_data(body.owner, body.repo)
        analysis = analyze_tree(data["files"])
        return {
            "meta":     data["meta"],
            "analysis": analysis,
            "files":    data["files"],
            "readme":   data["readme"],
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
