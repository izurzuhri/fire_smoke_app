import asyncio
from typing import Dict, List
from starlette.websockets import WebSocket

from ..config import CameraConfig, settings
from ..models.dto import DetectionMessage
from .inference import InferenceService


class DetectionBroadcaster:
    def __init__(self) -> None:
        self.connections: List[WebSocket] = []
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self.lock:
            self.connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        try:
            self.connections.remove(websocket)
        except ValueError:
            return

    async def broadcast(self, message: DetectionMessage) -> None:
        async with self.lock:
            stale: List[WebSocket] = []
            for ws in self.connections:
                try:
                    await ws.send_json(message.dict())
                except Exception:
                    stale.append(ws)
            for ws in stale:
                self.disconnect(ws)


class CameraManager:
    def __init__(self, cameras: List[CameraConfig], broadcaster: DetectionBroadcaster) -> None:
        self.cameras = cameras
        self.broadcaster = broadcaster
        self.inference = InferenceService()
        self.tasks: Dict[str, asyncio.Task] = {}
        self.running = False

    async def start(self) -> None:
        if self.running:
            return
        self.running = True
        for camera in self.cameras:
            task = asyncio.create_task(self._camera_loop(camera))
            self.tasks[camera.camera_id] = task

    async def stop(self) -> None:
        self.running = False
        for task in self.tasks.values():
            task.cancel()
        self.tasks.clear()

    async def _camera_loop(self, camera: CameraConfig) -> None:
        while self.running:
            payload = await self.inference.run_inference(camera.camera_id)
            await self.broadcaster.broadcast(payload)
            await asyncio.sleep(settings.inference_interval_seconds)
