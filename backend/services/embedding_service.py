"""
Semantic file retrieval using local embeddings (fastembed, no extra API key).

Flow:
  1. On first chat — embed all repo files once, cache the vectors.
  2. On each message — embed the user query, cosine-similarity search,
     return the top-k most relevant file paths.

Model: BAAI/bge-small-en-v1.5 (~33 MB, downloaded once, runs on CPU in <1s).
"""
import asyncio
from typing import Optional
import numpy as np

# Lazy singleton — model loads only when first needed
_model = None


def _get_model():
    global _model
    if _model is None:
        from fastembed import TextEmbedding
        _model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
    return _model


def _embed_sync(documents: list[str]) -> np.ndarray:
    model = _get_model()
    return np.array(list(model.embed(documents)), dtype=np.float32)


async def embed_files(
    contents: dict[str, Optional[str]],
) -> dict:
    """
    Embed every non-empty file.
    Returns {"embeddings": ndarray(N, D), "paths": [str, ...]}.
    Run in a thread pool so the sync model doesn't block the event loop.
    """
    paths, documents = [], []
    for path, content in contents.items():
        if not content:
            continue
        # Prefix with path so the model understands file context
        documents.append(f"File: {path}\n\n{content[:2000]}")
        paths.append(path)

    if not documents:
        return {"embeddings": np.empty((0, 384), dtype=np.float32), "paths": []}

    loop = asyncio.get_event_loop()
    embeddings = await loop.run_in_executor(None, _embed_sync, documents)
    return {"embeddings": embeddings, "paths": paths}


def retrieve(
    query: str,
    embedding_data: dict,
    top_k: int = 8,
) -> list[str]:
    """
    Return the top_k file paths most semantically similar to query.
    Pure numpy — runs in microseconds.
    """
    embeddings: np.ndarray = embedding_data["embeddings"]
    paths: list[str]       = embedding_data["paths"]

    if len(paths) == 0:
        return []

    model = _get_model()
    query_vec = np.array(list(model.embed([query])), dtype=np.float32)[0]

    # Cosine similarity
    norms  = np.linalg.norm(embeddings, axis=1)
    q_norm = np.linalg.norm(query_vec)
    scores = (embeddings @ query_vec) / (norms * q_norm + 1e-9)

    top_indices = np.argsort(scores)[::-1][:top_k]
    return [paths[i] for i in top_indices]
