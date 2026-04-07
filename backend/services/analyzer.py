"""
Static analysis of a repo's file tree to extract:
- Top-level directory structure
- Language distribution
- Key entry points (main.py, index.ts, App.tsx, etc.)
- Import/dependency relationships (best-effort, language-agnostic regex)
"""
import re
from collections import defaultdict
from typing import Optional


ENTRY_POINTS = {
    "main.py", "app.py", "server.py", "manage.py",
    "index.js", "index.ts", "main.js", "main.ts",
    "App.tsx", "App.jsx", "app.tsx", "app.jsx",
    "main.go", "main.rs", "Program.cs",
}

LANG_MAP = {
    ".py": "Python", ".js": "JavaScript", ".ts": "TypeScript",
    ".tsx": "TypeScript/React", ".jsx": "JavaScript/React",
    ".go": "Go", ".rs": "Rust", ".java": "Java", ".rb": "Ruby",
    ".php": "PHP", ".cs": "C#", ".cpp": "C++", ".c": "C",
    ".swift": "Swift", ".kt": "Kotlin", ".vue": "Vue",
    ".svelte": "Svelte",
}


def analyze_tree(files: list[dict]) -> dict:
    lang_counts: dict[str, int] = defaultdict(int)
    dir_counts: dict[str, int] = defaultdict(int)
    entry_points: list[str] = []
    config_files: list[str] = []

    for f in files:
        path: str = f["path"]
        parts = path.split("/")
        ext = "." + path.rsplit(".", 1)[-1].lower() if "." in path else ""
        lang = LANG_MAP.get(ext)
        if lang:
            lang_counts[lang] += 1
        top_dir = parts[0] if len(parts) > 1 else "(root)"
        dir_counts[top_dir] += 1
        filename = parts[-1]
        if filename in ENTRY_POINTS:
            entry_points.append(path)
        if filename in {
            "package.json", "requirements.txt", "Cargo.toml",
            "go.mod", "pom.xml", "build.gradle", "Makefile",
            "docker-compose.yml", "Dockerfile", ".env.example",
        }:
            config_files.append(path)

    return {
        "total_files": len(files),
        "languages": dict(sorted(lang_counts.items(), key=lambda x: -x[1])),
        "top_directories": dict(sorted(dir_counts.items(), key=lambda x: -x[1])[:15]),
        "entry_points": entry_points,
        "config_files": config_files,
    }


def extract_imports(path: str, content: str) -> list[str]:
    """Best-effort extraction of internal module imports."""
    imports: list[str] = []
    ext = "." + path.rsplit(".", 1)[-1].lower() if "." in path else ""

    if ext == ".py":
        for m in re.finditer(r"^(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))", content, re.MULTILINE):
            mod = m.group(1) or m.group(2)
            if mod:
                imports.append(mod.split(".")[0])

    elif ext in {".js", ".ts", ".jsx", ".tsx"}:
        for m in re.finditer(r'(?:import|require)\s*\(?["\']([./][^"\']+)["\']', content):
            imports.append(m.group(1))

    elif ext == ".go":
        for m in re.finditer(r'"([^"]+)"', content):
            val = m.group(1)
            if "/" in val and not val.startswith("http"):
                imports.append(val.split("/")[-1])

    return list(set(imports))[:20]


def build_dependency_graph(
    files: list[dict],
    contents: dict[str, Optional[str]],
) -> dict[str, list[str]]:
    """Return {file_path: [imported_module, ...]} for diagram generation."""
    graph: dict[str, list[str]] = {}
    for f in files:
        path = f["path"]
        content = contents.get(path)
        if not content:
            continue
        deps = extract_imports(path, content)
        if deps:
            graph[path] = deps
    return graph
