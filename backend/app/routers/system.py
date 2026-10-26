from fastapi import APIRouter

from app.schemas import HealthRead

router = APIRouter(tags=["System"])


@router.get("/health", response_model=HealthRead)
def health() -> HealthRead:
    return HealthRead(status="ok")
