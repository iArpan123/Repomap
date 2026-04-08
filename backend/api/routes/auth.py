"""
GitHub OAuth routes.

Setup (one-time):
  1. Go to https://github.com/settings/developers → OAuth Apps → New OAuth App
  2. Set Homepage URL:            http://localhost:5173
  3. Set Authorization callback:  http://localhost:8000/api/auth/callback
  4. Copy Client ID + Client Secret into .env
"""
import os
import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

CLIENT_ID     = os.getenv("GITHUB_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
FRONTEND_URL  = os.getenv("FRONTEND_URL", "http://localhost:5173")

GITHUB_AUTHORIZE = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_API       = "https://api.github.com"


@router.get("/login")
def github_login():
    """Redirect browser to GitHub OAuth consent screen."""
    if not CLIENT_ID:
        raise HTTPException(status_code=500, detail="GITHUB_CLIENT_ID not configured")
    url = (
        f"{GITHUB_AUTHORIZE}"
        f"?client_id={CLIENT_ID}"
        f"&scope=read:user,repo"
    )
    return RedirectResponse(url)


@router.get("/callback")
async def github_callback(code: str):
    """
    GitHub redirects here with ?code=xxx.
    Exchange code → access token → redirect to frontend /repos?token=xxx
    """
    async with httpx.AsyncClient() as client:
        # Exchange code for access token
        r = await client.post(
            GITHUB_TOKEN_URL,
            json={"client_id": CLIENT_ID, "client_secret": CLIENT_SECRET, "code": code},
            headers={"Accept": "application/json"},
        )
        data = r.json()

    token = data.get("access_token")
    if not token:
        return RedirectResponse(f"{FRONTEND_URL}/?error=oauth_failed")

    # Pass token to frontend via query param — frontend stores in localStorage
    return RedirectResponse(f"{FRONTEND_URL}/repos?token={token}")


@router.get("/me")
async def get_me(request: Request):
    """Return authenticated GitHub user info."""
    token = _extract_token(request)
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{GITHUB_API}/user",
            headers=_gh_headers(token),
        )
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = r.json()

    return {
        "login":      user["login"],
        "name":       user.get("name") or user["login"],
        "avatar_url": user["avatar_url"],
        "html_url":   user["html_url"],
    }


@router.get("/repos")
async def get_user_repos(request: Request):
    """Return the authenticated user's public repos, sorted by last push."""
    token = _extract_token(request)
    repos = []
    page  = 1

    async with httpx.AsyncClient() as client:
        while True:
            r = await client.get(
                f"{GITHUB_API}/user/repos",
                params={
                    "visibility":  "all",       # public + private
                    "affiliation": "owner",
                    "sort":        "pushed",
                    "per_page":    100,
                    "page":        page,
                },
                headers=_gh_headers(token),
            )
            if r.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid token")
            batch = r.json()
            if not batch:
                break
            repos.extend(batch)
            if len(batch) < 100:
                break
            page += 1

    return [
        {
            "name":        r["name"],
            "full_name":   r["full_name"],
            "description": r.get("description") or "",
            "language":    r.get("language") or "",
            "stars":       r["stargazers_count"],
            "forks":       r["forks_count"],
            "updated_at":  r["pushed_at"],
            "html_url":    r["html_url"],
            "owner":       r["owner"]["login"],
            "private":     r["private"],
        }
        for r in repos
    ]


# ── helpers ──────────────────────────────────────────────────

def _extract_token(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    raise HTTPException(status_code=401, detail="Missing Authorization header")


def _gh_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Accept":        "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
