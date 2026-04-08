from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from services import github_service
from services.analyzer import analyze_tree
from services import cache

router = APIRouter()


class RepoRequest(BaseModel):
    owner: str
    repo: str


def _user_token(request: Request):
    auth = request.headers.get("Authorization", "")
    return auth[7:] if auth.startswith("Bearer ") else None


async def get_github_data(owner: str, repo: str, token=None) -> dict:
    cached = cache.get("github", owner, repo)
    if cached:
        return cached
    meta   = await github_service.get_repo_meta(owner, repo, token)
    files  = await github_service.get_file_tree(owner, repo, meta["default_branch"], token)
    readme = await github_service.get_readme(owner, repo, token)
    data   = {"meta": meta, "files": files, "readme": readme}
    cache.set("github", owner, repo, data, cache.GITHUB_TTL)
    return data


@router.post("/analyze")
async def analyze_repo(body: RepoRequest, request: Request):
    try:
        token    = _user_token(request)
        data     = await get_github_data(body.owner, body.repo, token)
        analysis = analyze_tree(data["files"])
        return {"meta": data["meta"], "analysis": analysis, "files": data["files"], "readme": data["readme"]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
