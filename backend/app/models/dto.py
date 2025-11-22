from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional


class Detection(BaseModel):
    label: str
    confidence: float
    bbox: List[int]


class DetectionMessage(BaseModel):
    camera_id: str
    timestamp: datetime
    detections: List[Detection]


class CameraInfo(BaseModel):
    camera_id: str
    name: str
    rtsp_url: Optional[str] = None
    file_path: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    version: str
