import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router as api_router
from .config import settings
from .services.camera_manager import CameraManager, DetectionBroadcaster

app = FastAPI(title=settings.app_name, version=settings.version)

broadcaster = DetectionBroadcaster()
camera_manager = CameraManager(settings.load_cameras(), broadcaster)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.on_event("startup")
async def startup() -> None:
    await camera_manager.start()


@app.on_event("shutdown")
async def shutdown() -> None:
    await camera_manager.stop()


@app.websocket("/ws/detections")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await broadcaster.connect(websocket)
    try:
        while True:
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=60)
            except asyncio.TimeoutError:
                # Keep the connection alive; no-op
                continue
    except WebSocketDisconnect:
        broadcaster.disconnect(websocket)
    except Exception:
        broadcaster.disconnect(websocket)
