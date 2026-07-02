"""
Pagination helpers — reusable across all list endpoints.

Usage:
    from app.core.pagination import PageParams, page_params

    @router.get("")
    async def list(params: PageParams = Depends(page_params)):
        rows, total = await service.list(params)
        return paginated_response(rows, total, params)
"""
from __future__ import annotations

import math
from dataclasses import dataclass

from fastapi import Query


@dataclass
class PageParams:
    page:  int
    limit: int

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit

    def total_pages(self, total: int) -> int:
        return math.ceil(total / self.limit) if total else 1


def page_params(
    page:  int = Query(1,  ge=1,          description="Page number (1-based)"),
    limit: int = Query(20, ge=1, le=500,  description="Items per page"),
) -> PageParams:
    """FastAPI dependency — inject as `Depends(page_params)`."""
    return PageParams(page=page, limit=limit)
