"""
Streaming chatbot that answers questions about a repo.
Uses semantic retrieval to send only the most relevant files to Claude,
keeping the context small and responses fast.
"""
import os
import anthropic
from typing import AsyncIterator, Optional
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

MAX_FILE_CHARS = 1_500   # chars per file snippet
MAX_FILES      = 8       # how many retrieved files to include


def build_focused_context(
    meta: dict,
    analysis: dict,
    relevant_paths: list[str],
    contents: dict[str, Optional[str]],
    readme: Optional[str],
) -> str:
    """
    Build a compact context from semantically relevant files only.
    Always includes repo metadata + file tree summary + README snippet.
    """
    parts: list[str] = []

    parts.append(f"# Repository: {meta['full_name']}")
    parts.append(f"Description: {meta.get('description', 'N/A')}")
    parts.append(f"Language: {meta.get('language', 'N/A')}")
    parts.append(f"Topics: {', '.join(meta.get('topics', []))}\n")

    if readme:
        parts.append("## README\n" + readme[:2000])

    parts.append(f"\n## File Tree Summary")
    parts.append("Languages: " + str(analysis["languages"]))
    parts.append("Directories: " + str(analysis["top_directories"]))
    parts.append("Entry points: " + str(analysis["entry_points"]))
    parts.append("Config files: " + str(analysis["config_files"]))

    parts.append(f"\n## Most Relevant Files (retrieved for this query)")
    for path in relevant_paths[:MAX_FILES]:
        content = contents.get(path)
        if content:
            parts.append(f"\n### {path}\n```\n{content[:MAX_FILE_CHARS]}\n```")

    return "\n".join(parts)


SYSTEM_PROMPT = """\
You are an expert software engineer and technical onboarding assistant.
You have been given context about a GitHub repository, including the most relevant
files for the current question (retrieved via semantic search).
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
