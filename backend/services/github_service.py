import os
import httpx
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
BASE_URL = "https://api.github.com"

HEADERS = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}
if GITHUB_TOKEN:
    HEADERS["Authorization"] = f"Bearer {GITHUB_TOKEN}"

# Extensions we care about for analysis (skip assets, lock files, etc.)
RELEVANT_EXTENSIONS = {
    ".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".go", ".rs",
    ".rb", ".php", ".cs", ".cpp", ".c", ".h", ".swift", ".kt",
    ".vue", ".svelte", ".html", ".css", ".scss",
    ".json", ".yaml", ".yml", ".toml", ".env.example",
}
SKIP_DIRS = {"node_modules", ".git", "dist", "build", "__pycache__", ".next", "vendor"}
MAX_FILES = 150  # cap to avoid huge repos blowing the context window


async def get_repo_meta(owner: str, repo: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE_URL}/repos/{owner}/{repo}", headers=HEADERS)
        r.raise_for_status()
        data = r.json()
    return {
        "name": data["name"],
        "full_name": data["full_name"],
        "description": data.get("description"),
        "language": data.get("language"),
        "stars": data["stargazers_count"],
        "forks": data["forks_count"],
        "topics": data.get("topics", []),
        "default_branch": data["default_branch"],
        "html_url": data["html_url"],
    }


async def get_file_tree(owner: str, repo: str, branch: str = "main") -> list[dict]:
    """Return a flat list of relevant file paths via the git trees API."""
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{BASE_URL}/repos/{owner}/{repo}/git/trees/{branch}?recursive=1",
            headers=HEADERS,
        )
        if r.status_code == 404:
            # try master
            r = await client.get(
                f"{BASE_URL}/repos/{owner}/{repo}/git/trees/master?recursive=1",
                headers=HEADERS,
            )
        r.raise_for_status()
        tree = r.json().get("tree", [])

    files = []
    for item in tree:
        if item["type"] != "blob":
            continue
        path: str = item["path"]
        parts = path.split("/")
        if any(part in SKIP_DIRS for part in parts):
            continue
        ext = os.path.splitext(path)[1].lower()
        if ext not in RELEVANT_EXTENSIONS:
            continue
        files.append({"path": path, "size": item.get("size", 0)})
        if len(files) >= MAX_FILES:
            break
    return files


async def get_file_content(owner: str, repo: str, path: str, branch: str) -> Optional[str]:
    """Fetch raw file content. Returns None on error or if binary."""
    url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}"
    async with httpx.AsyncClient() as client:
        r = await client.get(url, headers={"Authorization": HEADERS.get("Authorization", "")})
        if r.status_code != 200:
            return None
        # Skip files that look binary
        try:
            return r.text
        except Exception:
            return None


async def get_readme(owner: str, repo: str) -> Optional[str]:
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE_URL}/repos/{owner}/{repo}/readme", headers=HEADERS)
        if r.status_code != 200:
            return None
        import base64
        content = r.json().get("content", "")
        try:
            return base64.b64decode(content).decode("utf-8")
        except Exception:
            return None
