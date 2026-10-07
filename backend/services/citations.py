"""Citation labels derived only from parser-provided metadata."""
from typing import Any
import re


def citation_label(evidence: dict[str, Any]) -> str:
    name = evidence.get("document_name") or "document"
    location = evidence.get("location") or {}
    if "page" in location:
        label = f"{name}, p.{location['page']}"
        source_type = evidence.get("source_type", "")
        content_type = evidence.get("content_type", "")
        if source_type == "ocr" or evidence.get("extraction_method") == "ocr":
            label += ", OCR"
        elif source_type == "chart" or content_type == "chart":
            label += ", Chart"
        elif source_type == "table" or content_type in ("table_row", "table_header"):
            label += ", Table"
        return label
    if "slide" in location:
        return f"{name}, slide {location['slide']}"
    if "sheet" in location:
        return f"{name}, sheet {location['sheet']}"
    if "paragraph" in location:
        return f"{name}, paragraph {location['paragraph']}"
    if "row" in location:
        return f"{name}, row {location['row']}"
    return evidence.get("source_reference") or name


def consolidate_citations(answer: str, evidence: list[dict[str, Any]]) -> str:
    """Move valid source references to one deduplicated line after the answer."""
    labels = list(dict.fromkeys(citation_label(item) for item in evidence))
    used: list[str] = []

    def numbered(match: re.Match[str]) -> str:
        index = int(match.group(1)) - 1
        if 0 <= index < len(labels):
            label = labels[index]
            if label not in used:
                used.append(label)
            return f"[{label}]"
        return ""

    text = re.sub(r"\[(\d+)\]", numbered, answer)
    known = {f"[{label}]": label for label in labels}
    for token, label in known.items():
        if token in text and label not in used:
            used.append(label)
    # Remove fabricated filename/page citations, but leave ordinary bracketed prose alone.
    text = re.sub(
        r"\[([^\]\n]+,\s*(?:p\.|slide |sheet ).*?)\]",
        lambda match: match.group(0) if match.group(0) in known else "",
        text,
    )
    for token in known:
        text = text.replace(token, "")
    # Do not keep a model-generated source footer; we create one canonical footer below.
    text = re.sub(r"(?im)^\s*(?:sources?|references?)\s*:.*$", "", text)
    text = re.sub(r"[ \t]+([.,;:])", r"\1", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    if not used and labels:
        used = labels[:1]
    if used:
        text += f"\n\nSource: {'; '.join(f'[{label}]' for label in used)}"
    return text
