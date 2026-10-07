"""Citation labels derived only from parser-provided metadata."""
from typing import Any


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
