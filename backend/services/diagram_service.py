"""
Generates a structured JSON graph (nodes + edges) for React Flow rendering.
Uses Claude to analyse the repo and produce architecture data.
"""
import os
import json
import re
import anthropic
from dotenv import load_dotenv
from .analyzer import analyze_tree, build_dependency_graph
from typing import Optional

load_dotenv()

client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def _build_prompt(
    meta: dict,
    analysis: dict,
    dep_graph: dict[str, list[str]],
    readme: Optional[str],
) -> str:
    readme_snippet = (readme or "")[:3000]
    dep_sample = dict(list(dep_graph.items())[:50])

    return f"""You are a principal software architect. Analyse this GitHub repository and produce a \
PRECISE architecture graph in JSON format for a React Flow diagram renderer.

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

## Dependency Map (file → imports)
{dep_sample}

## README
{readme_snippet}

---

## OUTPUT FORMAT

Return a single JSON object — nothing else, no markdown fences, no prose:

{{
  "title": "short human-readable architecture title",
  "nodes": [
    {{
      "id": "SCREAMING_SNAKE_CASE_ID",
      "label": "emoji + short label",
      "sublabel": "tech detail or framework name (optional, keep short)",
      "layer": "one of: user | frontend | backend | database | external"
    }}
  ],
  "edges": [
    {{
      "id": "e_SOURCE_TARGET",
      "source": "SOURCE_ID",
      "target": "TARGET_ID",
      "label": "≤4 word relationship label",
      "animated": true
    }}
  ]
}}

## RULES

### Nodes (15–22 total)
- Represent real architectural components, NOT file names
- id: SCREAMING_SNAKE_CASE, no spaces, no special chars
- label: start with a relevant emoji, e.g. "⚛️ React App", "🔐 Auth Service"
- sublabel: framework/version/tech, e.g. "Spring Boot 3", "PostgreSQL 15"
- layer assignment:
  * user       → the end user, browser, mobile client
  * frontend   → UI components, pages, state, HTTP clients, service workers
  * backend    → API controllers, services, middleware, schedulers, jobs
  * database   → SQL/NoSQL DBs, ORM layers, caches, file storage
  * external   → third-party APIs, auth providers, AI services, CDNs, push services

### Edges
- Every source + target must reference an existing node id
- animated: true for primary data flows, false for secondary
- label: short and meaningful ("REST/JWT", "reads", "sends push", etc.)

### Coverage — infer from files + README:
- How does a user request travel through the full stack?
- Authentication / authorization flow
- Data persistence layer
- Background jobs / scheduled tasks
- External integrations (OAuth, AI, notifications, storage)

Return ONLY the raw JSON object. No explanation. No markdown. No code fences.
"""


async def generate_diagram(
    meta: dict,
    files: list[dict],
    contents: dict[str, Optional[str]],
    readme: Optional[str],
) -> dict:
    analysis = analyze_tree(files)
    dep_graph = build_dependency_graph(files, contents)
    prompt = _build_prompt(meta, analysis, dep_graph, readme)

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = message.content[0].text.strip()

    # Strip markdown code fences if model added them
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    return json.loads(raw)
