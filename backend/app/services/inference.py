import asyncio
import random
from datetime import datetime
from typing import List

from ..models.dto import Detection, DetectionMessage


class InferenceService:
    async def run_inference(self, camera_id: str) -> DetectionMessage:
        # Placeholder inference logic; replace with real YOLO integration.
        await asyncio.sleep(0)
        detections: List[Detection] = []
        if random.random() > 0.4:
            label = random.choice(["fire", "smoke"])
            bbox = [random.randint(0, 400) for _ in range(4)]
            confidence = round(random.uniform(0.3, 0.99), 3)
            detections.append(Detection(label=label, confidence=confidence, bbox=bbox))
        return DetectionMessage(
            camera_id=camera_id,
            timestamp=datetime.utcnow(),
            detections=detections,
        )

    def integration_hint(self) -> str:
        return (
            "Replace InferenceService.run_inference with a call to your YOLO script or model. "
            "It receives camera_id and should return a DetectionMessage."
        )
