"""
Flyweight Pattern — shares immutable icon/color metadata objects across all
category instances that have identical visual properties.

Instead of allocating a new (icon, color) pair for every category object,
CategoryIconPool returns the same CategoryMeta instance whenever the same
combination is requested. Useful when many categories share a color palette.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class CategoryMeta:
    """Intrinsic (shared) state — immutable visual properties of a category."""
    icon: str
    color: str


class CategoryIconPool:
    """Flyweight factory — creates CategoryMeta instances on first use, then reuses them."""

    _pool: dict[tuple[str, str], CategoryMeta] = {}

    @classmethod
    def get(cls, icon: str, color: str) -> CategoryMeta:
        key = (icon, color)
        if key not in cls._pool:
            cls._pool[key] = CategoryMeta(icon=icon, color=color)
        return cls._pool[key]

    @classmethod
    def pool_size(cls) -> int:
        return len(cls._pool)
