# RepoMap

> Understand any GitHub repo in minutes, not days.

RepoMap generates an AI-powered architecture diagram and provides a chatbot that knows every file in any public GitHub repository — built to accelerate onboarding for engineers joining a new company.

## Features

- **Architecture Diagram** — AI-generated Mermaid.js diagram showing components, layers, data flow, and external integrations
- **Repo Chatbot** — Streaming AI assistant with full codebase context; ask anything about structure, patterns, or where to start
- **Fast Onboarding** — Go from zero to productive in minutes

## Stack

| Layer    | Tech                        |
|----------|-----------------------------|
| Backend  | Python · FastAPI · Anthropic Claude |
| Frontend | React · Vite · Tailwind CSS · Mermaid.js |
| Data     | GitHub REST API             |

## Setup

### 1. Clone & configure secrets

```bash
cp backend/.env.example backend/.env
# Fill in GITHUB_TOKEN and ANTHROPIC_API_KEY
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

## Usage

Enter any public GitHub URL or `owner/repo` on the home page.

- **Architecture Diagram tab** — generates an AI diagram of the repo's architecture
- **Repo Chat tab** — chat with the codebase; first message builds the context (~15s)

## Project Structure

```
repomap/
├── backend/
│   ├── main.py                  # FastAPI app
│   ├── api/routes/
│   │   ├── repo.py              # GET repo metadata & file tree
│   │   ├── diagram.py           # POST generate Mermaid diagram
│   │   └── chat.py              # POST streaming chat
│   └── services/
│       ├── github_service.py    # GitHub API client
│       ├── analyzer.py          # Static code analysis
│       ├── diagram_service.py   # Claude diagram generation
│       └── chat_service.py      # Claude streaming chat
└── frontend/
    └── src/
        ├── pages/
        │   ├── HomePage.jsx
        │   └── AnalysisPage.jsx
        └── components/
            ├── DiagramPanel.jsx
            ├── ChatPanel.jsx
            └── RepoHeader.jsx
```
