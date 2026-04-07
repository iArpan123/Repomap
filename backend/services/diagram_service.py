"""
Generates a Mermaid.js diagram string that represents the repo architecture.
Uses Claude to produce a high-quality, human-readable diagram from the analysis.
"""
import os
import anthropic
from dotenv import load_dotenv
from .analyzer import analyze_tree, build_dependency_graph
from typing import Optional

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def _build_prompt(
    meta: dict,
    analysis: dict,
    dep_graph: dict[str, list[str]],
    readme: Optional[str],
) -> str:
    readme_snippet = (readme or "")[:2000]
    dep_sample = dict(list(dep_graph.items())[:40])

    return f"""You are an expert software architect. Analyze this GitHub repository and generate a Mermaid.js architecture diagram.

## Repository: {meta['full_name']}
Description: {meta.get('description', 'N/A')}
Primary language: {meta.get('language', 'N/A')}
Topics: {', '.join(meta.get('topics', []))}

## File Analysis
Total files: {analysis['total_files']}
Languages: {analysis['languages']}
Top directories: {analysis['top_directories']}
Entry points: {analysis['entry_points']}
Config files: {analysis['config_files']}

## Dependency Sample (file → imports)
{dep_sample}

## README excerpt
{readme_snippet}

---
Generate a Mermaid `graph TD` diagram that shows:
1. The main architectural layers/components (frontend, backend, database, services, etc.)
2. How the key directories/modules relate to each other
3. External services or integrations (e.g., GitHub API, database, auth)
4. Data flow direction with labeled arrows

Rules:
- Use clear, human-readable node labels (not raw file paths)
- Group related components with subgraphs
- Limit to 20-30 nodes max — prioritize the big picture
- Return ONLY the raw Mermaid code block (no explanation, no markdown fences)
- Start directly with `graph TD`
"""


async def generate_diagram(
    meta: dict,
    files: list[dict],
    contents: dict[str, Optional[str]],
    readme: Optional[str],
) -> str:
    analysis = analyze_tree(files)
    dep_graph = build_dependency_graph(files, contents)
    prompt = _build_prompt(meta, analysis, dep_graph, readme)

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    mermaid_code = message.content[0].text.strip()
    # Strip markdown fences if model added them anyway
    if mermaid_code.startswith("```"):
        lines = mermaid_code.split("\n")
        mermaid_code = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
    return mermaid_code
