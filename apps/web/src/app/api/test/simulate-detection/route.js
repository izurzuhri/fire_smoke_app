import sql from "@/app/api/utils/sql";
import { broadcastDetection } from "../../ws/route.js";

// POST /api/test/simulate-detection - Simulate a detection for testing
export async function POST(request) {
  try {
    const body = await request.json();
    const { camera_id } = body;

    if (!camera_id) {
      return Response.json({ error: "camera_id is required" }, { status: 400 });
    }

    // Verify camera exists
    const [camera] = await sql`
      SELECT id, name FROM cameras WHERE id = ${camera_id}
    `;

    if (!camera) {
      return Response.json({ error: "Camera not found" }, { status: 404 });
    }

    // Generate mock detection
    const detectionType = Math.random() > 0.5 ? "fire" : "smoke";
    const confidence = 0.7 + Math.random() * 0.3; // 0.7-1.0

    // Store detection in database
    const [stored] = await sql`
      INSERT INTO detections (
        camera_id, 
        detection_type, 
        confidence, 
        bbox_x1, bbox_y1, bbox_x2, bbox_y2
      )
      VALUES (
        ${camera_id},
        ${detectionType},
        ${confidence},
        ${Math.floor(Math.random() * 200)},
        ${Math.floor(Math.random() * 150)},
        ${Math.floor(Math.random() * 200) + 200},
        ${Math.floor(Math.random() * 150) + 150}
      )
      RETURNING *
    `;

    const formattedDetection = {
      id: stored.id,
      camera_id: stored.camera_id,
      camera_name: camera.name,
      detection_type: stored.detection_type,
      confidence: parseFloat(stored.confidence),
      bbox: [stored.bbox_x1, stored.bbox_y1, stored.bbox_x2, stored.bbox_y2],
      timestamp: stored.timestamp,
    };

    // Broadcast to WebSocket clients
    broadcastDetection(formattedDetection);

    return Response.json({
      message: "Detection simulated successfully",
      detection: formattedDetection,
    });
  } catch (error) {
    console.error("Error simulating detection:", error);
    return Response.json(
      { error: "Failed to simulate detection" },
      { status: 500 },
    );
  }
}
