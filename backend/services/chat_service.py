"""
Streaming chatbot that answers questions about a repo.
Builds a context window from: README, key file contents, file tree, and analysis.
"""
import os
import anthropic
from typing import AsyncIterator, Optional
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

MAX_CONTEXT_CHARS = 60_000  # leave room for conversation history + response


def build_repo_context(
    meta: dict,
    analysis: dict,
    files: list[dict],
    contents: dict[str, Optional[str]],
    readme: Optional[str],
) -> str:
    parts: list[str] = []

    parts.append(f"# Repository: {meta['full_name']}")
    parts.append(f"Description: {meta.get('description', 'N/A')}")
    parts.append(f"Language: {meta.get('language', 'N/A')}")
    parts.append(f"Topics: {', '.join(meta.get('topics', []))}\n")

    if readme:
        parts.append("## README\n" + readme[:3000])

    parts.append(f"\n## File Tree ({analysis['total_files']} files)")
    parts.append("Languages: " + str(analysis["languages"]))
    parts.append("Directories: " + str(analysis["top_directories"]))
    parts.append("Entry points: " + str(analysis["entry_points"]))
    parts.append("Config files: " + str(analysis["config_files"]))

    parts.append("\n## Key File Contents")
    budget = MAX_CONTEXT_CHARS - sum(len(p) for p in parts)
    for f in files:
        path = f["path"]
        content = contents.get(path)
        if not content:
            continue
        snippet = f"\n### {path}\n```\n{content[:1500]}\n```"
        if budget - len(snippet) < 500:
            break
        parts.append(snippet)
        budget -= len(snippet)

    return "\n".join(parts)


SYSTEM_PROMPT = """\
You are an expert software engineer and technical onboarding assistant.
You have been given full context about a GitHub repository.
Your job is to help new engineers understand the codebase quickly.
Answer questions clearly and concisely. Reference specific files, \
directories, or functions when relevant. If you don't know something, say so.\
"""


async def stream_chat(
    repo_context: str,
    history: list[dict],
    user_message: str,
) -> AsyncIterator[str]:
    messages = [
        *history,
        {"role": "user", "content": user_message},
    ]

    with client.messages.stream(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=SYSTEM_PROMPT + "\n\n## Repo Context\n" + repo_context,
        messages=messages,
    ) as stream:
        for text in stream.text_stream:
            yield text
