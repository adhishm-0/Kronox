from abc import ABC, abstractmethod
from typing import Any


class Parser(ABC):
    extensions: tuple[str, ...] = ()

    @abstractmethod
    def parse(self, path: str, name: str) -> list[dict[str, Any]]:
        """Return content blocks with content, location, section, and content_type."""


def block(content: str, location: dict[str, Any], section: str = "", content_type: str = "text", **extra: Any) -> dict[str, Any]:
    return {"content": content, "location": location, "section": section, "content_type": content_type, **extra}
