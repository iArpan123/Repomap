from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services import github_service
from services.diagram_service import generate_diagram
from services.analyzer import analyze_tree

router = APIRouter()


class DiagramRequest(BaseModel):
    owner: str
    repo: str


@router.post("/generate")
async def generate_repo_diagram(body: DiagramRequest):
    try:
        meta = await github_service.get_repo_meta(body.owner, body.repo)
        files = await github_service.get_file_tree(body.owner, body.repo, meta["default_branch"])

        # Fetch contents for key files (entry points + first N files)
        priority_files = [
            f for f in files
            if f["path"].split("/")[-1] in github_service.__dict__.get("ENTRY_POINTS", set())
               or f["size"] < 30_000
        ][:60]

        contents: dict[str, Optional[str]] = {}
        import asyncio
        tasks = [
            github_service.get_file_content(body.owner, body.repo, f["path"], meta["default_branch"])
            for f in priority_files
        ]
        results = await asyncio.gather(*tasks)
        for f, content in zip(priority_files, results):
            contents[f["path"]] = content

        readme = await github_service.get_readme(body.owner, body.repo)
        mermaid = await generate_diagram(meta, files, contents, readme)
        return {"mermaid": mermaid, "meta": meta}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
