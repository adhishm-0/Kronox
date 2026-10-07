"""Hybrid local retrieval using lexical overlap and sparse TF-IDF vectors."""
import json
import math
import re
from collections import Counter
from typing import Any

TOKEN_RE = re.compile(r"[\w₹.%'-]+", re.UNICODE)
STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how",
    "i", "in", "is", "it", "of", "on", "or", "that", "the", "this", "to",
    "was", "what", "when", "where", "which", "who", "with", "would", "you",
}


def tokenize(text: str) -> list[str]:
    return [token for token in TOKEN_RE.findall(text.lower()) if token not in STOPWORDS]


def rank_payloads(query: str, payloads: list[str], limit: int = 8) -> list[dict[str, Any]]:
    terms = tokenize(query)
    if not terms:
        return []
    documents: list[dict[str, Any]] = []
    for payload in payloads:
        try:
            item = json.loads(payload)
        except (TypeError, json.JSONDecodeError):
            continue
        if item.get("content_type") == "ocr_required" or item.get("confidence", 1) <= 0:
            continue
        documents.append(item)
    if not documents:
        return []

    counts = [Counter(tokenize(item.get("content", ""))) for item in documents]
    df = Counter(token for count in counts for token in count.keys())
    total = len(documents)
    idf = {token: math.log((total + 1) / (frequency + 1)) + 1 for token, frequency in df.items()}
    q_count = Counter(terms)
    q_vec = {token: (1 + math.log(freq)) * idf.get(token, 1) for token, freq in q_count.items()}
    q_norm = math.sqrt(sum(value * value for value in q_vec.values())) or 1
    ranked = []
    for item, count in zip(documents, counts):
        overlap = sum(min(count[token], 3) for token in q_count if token in count)
        if not overlap:
            continue
        d_vec = {token: (1 + math.log(freq)) * idf[token] for token, freq in count.items()}
        d_norm = math.sqrt(sum(value * value for value in d_vec.values())) or 1
        cosine = sum(q_vec[token] * d_vec.get(token, 0) for token in q_vec) / (q_norm * d_norm)
        lexical = overlap / max(1, sum(min(freq, 3) for freq in q_count.values()))
        score = 0.55 * cosine + 0.45 * lexical
        if item.get("content_type") in ("table_row", "table_header", "structured_value"):
            score += 0.025
        item["relevance"] = round(min(1.0, score), 4)
        ranked.append(item)
    ranked.sort(key=lambda item: (item["relevance"], item.get("confidence", 1)), reverse=True)
    return ranked[:limit]
