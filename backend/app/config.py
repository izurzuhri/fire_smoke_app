from pathlib import Path
from pydantic import BaseModel, BaseSettings, Field, validator
import json


class CameraConfig(BaseModel):
    camera_id: str
    name: str
    rtsp_url: str | None = None
    file_path: str | None = None

    @validator("rtsp_url", always=True)
    def validate_source(cls, rtsp_url: str | None, values):
        if not rtsp_url and not values.get("file_path"):
            raise ValueError("Either rtsp_url or file_path must be provided")
        return rtsp_url


class Settings(BaseSettings):
    app_name: str = Field(default="Fire & Smoke Monitor")
    version: str = Field(default="0.1.0")
    camera_config_path: Path = Field(
        default=Path(__file__).resolve().parent.parent / "config" / "cameras.json"
    )
    inference_interval_seconds: float = Field(default=1.0)

    class Config:
        env_prefix = "FIRE_SMOKE_"
        env_file = ".env"

    def load_cameras(self) -> list[CameraConfig]:
        with open(self.camera_config_path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        return [CameraConfig(**item) for item in data]


settings = Settings()
