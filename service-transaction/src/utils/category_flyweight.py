
from dataclasses import dataclass


@dataclass(frozen=True)
class CategoryMeta:
    icon: str
    color: str


class CategoryIconPool:

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
