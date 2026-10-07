"""Page-preserving chunking helpers for parser output."""
from typing import Any


def chunk_blocks(blocks: list[dict[str, Any]], max_chars: int = 1200) -> list[dict[str, Any]]:
    """Join fragmented text lines by page while leaving tables/structured items intact."""
    output: list[dict[str, Any]] = []
    pending: list[dict[str, Any]] = []
    pending_key: tuple[Any, ...] | None = None
    pending_length = 0

    def flush() -> None:
        nonlocal pending, pending_key, pending_length
        if not pending:
            return
        first = pending[0]
        item = dict(first)
        item["content"] = " ".join(str(part.get("content", "")).strip() for part in pending).strip()
        item["location"] = dict(first.get("location", {}))
        line_values = [part.get("location", {}).get("line") for part in pending]
        line_values = [value for value in line_values if value is not None]
        if line_values:
            item["location"]["line_start"] = min(line_values)
            item["location"]["line_end"] = max(line_values)
        item["chunk_index"] = len(output) + 1
        output.append(item)
        pending, pending_key, pending_length = [], None, 0

    for source in blocks:
        content = str(source.get("content", "")).strip()
        if not content:
            continue
        content_type = source.get("content_type", "text")
        location = source.get("location", {})
        key = (
            source.get("document_id"),
            source.get("section", ""),
            source.get("source_type", source.get("extraction_method", "text")),
            location.get("page"), location.get("slide"), location.get("sheet"),
        )
        if content_type in ("text", "ocr_text"):
            if pending and (key != pending_key or pending_length + len(content) + 1 > max_chars):
                flush()
            pending_key = key
            pending.append(source)
            pending_length += len(content) + 1
        else:
            flush()
            item = dict(source)
            item["chunk_index"] = len(output) + 1
            output.append(item)
    flush()
    return output
