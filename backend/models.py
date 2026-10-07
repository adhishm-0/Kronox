"""Shared document and evidence records used throughout the ingestion pipeline."""
from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class Evidence:
    evidence_id: str
    document_id: str
    document_name: str
    file_type: str
    location: dict[str, Any]
    section: str
    content_type: str
    content: str
    confidence: float = 1.0
    extraction_method: str = "parser"
    source_reference: str = ""

    def json(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class Document:
    document_id: str
    document_name: str
    file_type: str
    status: str
    evidence_count: int = 0
    summary: str = ""
    error: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def json(self) -> dict[str, Any]:
        return asdict(self)
