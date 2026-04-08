"""
Commit history analysis.
Fetches last N commits from GitHub, gets per-commit details (files + diffs),
then sends everything to Claude Haiku in one batch call to get structured analysis.
"""
import os
import re
import json
import httpx
import asyncio
import anthropic
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from services import github_service, cache
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

COMMIT_LIMIT = 20  # how many recent commits to analyse


class CommitsRequest(BaseModel):
    owner: str
    repo: str
    force: bool = False


def _user_token(request: Request):
    auth = request.headers.get("Authorization", "")
    return auth[7:] if auth.startswith("Bearer ") else None


async def _fetch_commits_list(owner: str, repo: str, branch: str, token: str) -> list:
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.get(
            f"https://api.github.com/repos/{owner}/{repo}/commits",
            params={"per_page": COMMIT_LIMIT, "sha": branch},
            headers=github_service._headers(token),
        )
        r.raise_for_status()
        return r.json()


async def _fetch_commit_detail(owner: str, repo: str, sha: str, token: str) -> dict | None:
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.get(
            f"https://api.github.com/repos/{owner}/{repo}/commits/{sha}",
            headers=github_service._headers(token),
        )
        if r.status_code != 200:
            return None
        return r.json()


def _build_analysis_prompt(commits_data: list[dict]) -> str:
    lines = []
    for i, c in enumerate(commits_data):
        lines.append(f"\n--- COMMIT {i+1} ---")
        lines.append(f"SHA: {c['sha'][:7]}")
        lines.append(f"Message: {c['message']}")
        lines.append(f"Author: {c['author']}")
        lines.append(f"Date: {c['date']}")
        lines.append(f"Stats: +{c['additions']} -{c['deletions']} across {c['file_count']} files")
        if c["files"]:
            lines.append("Files changed:")
            for f in c["files"][:8]:
                lines.append(f"  {f['filename']} (+{f['additions']} -{f['deletions']})")
                if f.get("patch"):
                    lines.append(f"  Diff preview: {f['patch'][:400]}")

    return f"""You are a senior software engineer analysing a Git commit history.
For each commit below, return a JSON analysis. Be concise but insightful.

{chr(10).join(lines)}

Return a JSON array (one object per commit, in the same order):
[
  {{
    "sha": "first 7 chars",
    "type": "feature|fix|refactor|docs|test|chore",
    "impact": "high|medium|low",
    "title": "one short line summarising the achievement (max 80 chars)",
    "summary": "2-3 sentences: what problem was solved, what was built or fixed",
    "what_changed": "technical bullet points of key changes (max 3 bullets, each starting with •)"
  }}
]

Rules:
- type=feature: new functionality added
- type=fix: bug or error corrected
- type=refactor: code restructured without changing behaviour
- type=docs: documentation, comments, readme changes
- type=test: tests added or updated
- type=chore: config, dependencies, build, CI changes
- impact=high: major feature, critical fix, or significant architectural change
- impact=medium: meaningful improvement or moderate fix
- impact=low: minor tweak, formatting, small docs update
- Return ONLY the raw JSON array. No markdown. No explanation."""


async def _analyse_with_claude(commits_data: list[dict]) -> list[dict]:
    prompt  = _build_analysis_prompt(commits_data)
    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = message.content[0].text.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw)


@router.post("/analyze")
async def analyze_commits(body: CommitsRequest, request: Request):
    try:
        token     = _user_token(request)
        cache_key = "commits"

        if not body.force:
            cached = cache.get(cache_key, body.owner, body.repo)
            if cached:
                return cached

        # 1. Get repo meta (reuse shared cache)
        github_data = cache.get("github", body.owner, body.repo)
        if github_data:
            branch = github_data["meta"]["default_branch"]
        else:
            meta   = await github_service.get_repo_meta(body.owner, body.repo, token)
            branch = meta["default_branch"]

        # 2. Fetch list of recent commits
        raw_commits = await _fetch_commits_list(body.owner, body.repo, branch, token)

        # 3. Fetch each commit's detail in parallel
        details = await asyncio.gather(*[
            _fetch_commit_detail(body.owner, body.repo, c["sha"], token)
            for c in raw_commits
        ])

        # 4. Build structured list for Claude
        commits_data = []
        for raw, detail in zip(raw_commits, details):
            if not detail:
                continue
            files = [
                {
                    "filename":  f["filename"],
                    "additions": f["additions"],
                    "deletions": f["deletions"],
                    "patch":     f.get("patch", "")[:500],
                }
                for f in detail.get("files", [])
            ]
            commits_data.append({
                "sha":        raw["sha"],
                "message":    raw["commit"]["message"].split("\n")[0],  # first line only
                "author":     raw["commit"]["author"]["name"],
                "author_login": (raw.get("author") or {}).get("login", ""),
                "avatar_url":   (raw.get("author") or {}).get("avatar_url", ""),
                "date":       raw["commit"]["author"]["date"],
                "additions":  detail["stats"]["additions"],
                "deletions":  detail["stats"]["deletions"],
                "file_count": len(detail.get("files", [])),
                "files":      files,
            })

        # 5. Batch analyse with Claude Haiku
        analyses = await _analyse_with_claude(commits_data)

        # 6. Merge raw data + AI analysis
        result_commits = []
        for raw_c, analysis in zip(commits_data, analyses):
            result_commits.append({
                "sha":          raw_c["sha"][:7],
                "full_sha":     raw_c["sha"],
                "message":      raw_c["message"],
                "author":       raw_c["author"],
                "author_login": raw_c["author_login"],
                "avatar_url":   raw_c["avatar_url"],
                "date":         raw_c["date"],
                "additions":    raw_c["additions"],
                "deletions":    raw_c["deletions"],
                "file_count":   raw_c["file_count"],
                "files":        [f["filename"] for f in raw_c["files"]],
                "type":         analysis.get("type", "chore"),
                "impact":       analysis.get("impact", "low"),
                "title":        analysis.get("title", raw_c["message"]),
                "summary":      analysis.get("summary", ""),
                "what_changed": analysis.get("what_changed", ""),
            })

        response = {"commits": result_commits, "total": len(result_commits)}
        cache.set(cache_key, body.owner, body.repo, response, cache.GITHUB_TTL)
        return response

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
