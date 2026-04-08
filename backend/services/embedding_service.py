"""
Keyword-based file retrieval using TF-IDF scoring.
Replaces fastembed to stay within Render free tier (512 MB RAM).
"""
import math
import re
from typing import Optional


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z_]\w*", text.lower())


def embed_files_sync(contents: dict[str, Optional[str]]) -> dict:
    """
    Build a TF-IDF index over file contents.
    Returns {"index": {path: {term: tf-idf}}, "paths": [str]}.
    """
    paths, docs = [], []
    for path, content in contents.items():
        if not content:
            continue
        paths.append(path)
        docs.append(f"{path}\n{content[:3000]}")

    if not docs:
        return {"index": {}, "paths": []}

    # Term frequency per doc
    tf: list[dict[str, float]] = []
    for doc in docs:
        tokens = _tokenize(doc)
        counts: dict[str, int] = {}
        for t in tokens:
            counts[t] = counts.get(t, 0) + 1
        total = max(len(tokens), 1)
        tf.append({t: c / total for t, c in counts.items()})

    # Document frequency
    df: dict[str, int] = {}
    for doc_tf in tf:
        for term in doc_tf:
            df[term] = df.get(term, 0) + 1

    N = len(docs)
    index: dict[str, dict[str, float]] = {}
    for path, doc_tf in zip(paths, tf):
        index[path] = {
            term: tf_val * math.log((N + 1) / (df[term] + 1))
            for term, tf_val in doc_tf.items()
        }

    return {"index": index, "paths": paths}


async def embed_files(contents: dict[str, Optional[str]]) -> dict:
    import asyncio
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, embed_files_sync, contents)


def retrieve(query: str, embedding_data: dict, top_k: int = 8) -> list[str]:
    """
    Score each file by summing TF-IDF weights for query terms.
    """
    index: dict[str, dict[str, float]] = embedding_data.get("index", {})
    paths: list[str] = embedding_data.get("paths", [])

    if not paths:
        return []

    query_terms = set(_tokenize(query))
    scores: dict[str, float] = {}
    for path in paths:
        doc_index = index.get(path, {})
        scores[path] = sum(doc_index.get(t, 0.0) for t in query_terms)

    return sorted(paths, key=lambda p: scores[p], reverse=True)[:top_k]
