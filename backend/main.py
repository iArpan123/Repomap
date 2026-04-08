from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import repo, diagram, chat, auth

app = FastAPI(title="RepoMap API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,    prefix="/api/auth",    tags=["auth"])
app.include_router(repo.router,    prefix="/api/repo",    tags=["repo"])
app.include_router(diagram.router, prefix="/api/diagram", tags=["diagram"])
app.include_router(chat.router,    prefix="/api/chat",    tags=["chat"])


@app.get("/health")
def health():
    return {"status": "ok"}
