from fastapi import APIRouter

from ..config import settings
from ..models.dto import CameraInfo, HealthResponse

router = APIRouter(prefix="/api")


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", version=settings.version)


@router.get("/cameras", response_model=list[CameraInfo])
async def list_cameras() -> list[CameraInfo]:
    return [CameraInfo(**camera.dict()) for camera in settings.load_cameras()]
