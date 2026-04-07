from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services import github_service
from services.analyzer import analyze_tree

router = APIRouter()


class RepoRequest(BaseModel):
    owner: str
    repo: str


@router.post("/analyze")
async def analyze_repo(body: RepoRequest):
    try:
        meta = await github_service.get_repo_meta(body.owner, body.repo)
        files = await github_service.get_file_tree(body.owner, body.repo, meta["default_branch"])
        analysis = analyze_tree(files)
        readme = await github_service.get_readme(body.owner, body.repo)
        return {
            "meta": meta,
            "analysis": analysis,
            "files": files,
            "readme": readme,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
