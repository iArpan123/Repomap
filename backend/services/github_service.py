import os
import base64
import httpx
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
BASE_URL     = "https://api.github.com"

RELEVANT_EXTENSIONS = {
    ".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".go", ".rs",
    ".rb", ".php", ".cs", ".cpp", ".c", ".h", ".swift", ".kt",
    ".vue", ".svelte", ".html", ".css", ".scss",
    ".json", ".yaml", ".yml", ".toml", ".env.example",
}
SKIP_DIRS = {"node_modules", ".git", "dist", "build", "__pycache__", ".next", "vendor"}
MAX_FILES  = 150


def _headers(user_token: Optional[str] = None) -> dict:
    """Build GitHub API headers, preferring the user's OAuth token."""
    token = user_token or GITHUB_TOKEN
    h = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


async def get_repo_meta(owner: str, repo: str, token: Optional[str] = None) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE_URL}/repos/{owner}/{repo}", headers=_headers(token))
        r.raise_for_status()
        data = r.json()
    return {
        "name":           data["name"],
        "full_name":      data["full_name"],
        "description":    data.get("description"),
        "language":       data.get("language"),
        "stars":          data["stargazers_count"],
        "forks":          data["forks_count"],
        "topics":         data.get("topics", []),
        "default_branch": data["default_branch"],
        "html_url":       data["html_url"],
        "private":        data.get("private", False),
    }


async def get_file_tree(owner: str, repo: str, branch: str = "main", token: Optional[str] = None) -> list[dict]:
    h = _headers(token)
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{BASE_URL}/repos/{owner}/{repo}/git/trees/{branch}?recursive=1",
            headers=h,
        )
        if r.status_code == 404:
            r = await client.get(
                f"{BASE_URL}/repos/{owner}/{repo}/git/trees/master?recursive=1",
                headers=h,
            )
        r.raise_for_status()
        tree = r.json().get("tree", [])

    files = []
    for item in tree:
        if item["type"] != "blob":
            continue
        path: str = item["path"]
        if any(part in SKIP_DIRS for part in path.split("/")):
            continue
        if os.path.splitext(path)[1].lower() not in RELEVANT_EXTENSIONS:
            continue
        files.append({"path": path, "size": item.get("size", 0)})
        if len(files) >= MAX_FILES:
            break
    return files


async def get_file_content(owner: str, repo: str, path: str, branch: str, token: Optional[str] = None) -> Optional[str]:
    """
    For private repos raw.githubusercontent.com requires auth via query param.
    Use the API contents endpoint instead — works for both public and private.
    """
    h = _headers(token)
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{BASE_URL}/repos/{owner}/{repo}/contents/{path}",
            params={"ref": branch},
            headers=h,
        )
        if r.status_code != 200:
            return None
        data = r.json()
        content = data.get("content", "")
        encoding = data.get("encoding", "base64")
        if encoding == "base64":
            try:
                return base64.b64decode(content).decode("utf-8")
            except Exception:
                return None
        return content


async def get_readme(owner: str, repo: str, token: Optional[str] = None) -> Optional[str]:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{BASE_URL}/repos/{owner}/{repo}/readme",
            headers=_headers(token),
        )
        if r.status_code != 200:
            return None
        try:
            return base64.b64decode(r.json().get("content", "")).decode("utf-8")
        except Exception:
            return None
