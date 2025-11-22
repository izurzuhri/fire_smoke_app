import { WebSocketServer } from "ws";
import sql from "@/app/api/utils/sql";

// Store active WebSocket connections
const clients = new Set();

// Create WebSocket server instance
let wss = null;

// GET request will upgrade to WebSocket connection
export async function GET(request) {
  const upgradeHeader = request.headers.get("upgrade");

  if (upgradeHeader !== "websocket") {
    return new Response("Expected Upgrade: websocket", { status: 426 });
  }

  // Initialize WebSocket server if not already done
  if (!wss) {
    wss = new WebSocketServer({
      port: 0, // Let system choose port
      perMessageDeflate: false,
    });

    wss.on("connection", handleWebSocketConnection);
    console.log("WebSocket server initialized for detection streaming");
  }

  return new Response(null, {
    status: 101,
    headers: {
      Upgrade: "websocket",
      Connection: "Upgrade",
    },
  });
}

function handleWebSocketConnection(ws) {
  console.log("New WebSocket client connected");
  clients.add(ws);

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === "subscribe") {
        // Client wants to subscribe to detection updates
        ws.isSubscribed = true;

        // Send initial camera status
        const cameras = await sql`
          SELECT id, name, status FROM cameras ORDER BY id
        `;

        ws.send(
          JSON.stringify({
            type: "camera_status",
            cameras: cameras,
          }),
        );

        // Send recent detections
        const recentDetections = await sql`
          SELECT 
            d.camera_id,
            c.name as camera_name,
            d.detection_type,
            d.confidence,
            d.bbox_x1, d.bbox_y1, d.bbox_x2, d.bbox_y2,
            d.timestamp
          FROM detections d
          JOIN cameras c ON d.camera_id = c.id
          WHERE d.timestamp >= NOW() - INTERVAL '10 minutes'
          ORDER BY d.timestamp DESC
          LIMIT 20
        `;

        for (const detection of recentDetections) {
          ws.send(
            JSON.stringify({
              type: "detection",
              camera_id: detection.camera_id,
              camera_name: detection.camera_name,
              detection_type: detection.detection_type,
              confidence: parseFloat(detection.confidence),
              bbox: [
                detection.bbox_x1,
                detection.bbox_y1,
                detection.bbox_x2,
                detection.bbox_y2,
              ],
              timestamp: detection.timestamp.toISOString(),
            }),
          );
        }
      }
    } catch (error) {
      console.error("Error handling WebSocket message:", error);
    }
  });

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
    clients.delete(ws);
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
    clients.delete(ws);
  });
}

// Broadcast detection to all connected clients
export function broadcastDetection(detection) {
  const message = JSON.stringify({
    type: "detection",
    camera_id: detection.camera_id,
    camera_name: detection.camera_name,
    detection_type: detection.detection_type,
    confidence: detection.confidence,
    bbox: detection.bbox,
    timestamp: new Date().toISOString(),
  });

  clients.forEach((client) => {
    if (client.readyState === 1 && client.isSubscribed) {
      // WebSocket.OPEN = 1
      try {
        client.send(message);
      } catch (error) {
        console.error("Error sending to WebSocket client:", error);
        clients.delete(client);
      }
    }
  });
}

// Broadcast camera status updates
export function broadcastCameraStatus(cameras) {
  const message = JSON.stringify({
    type: "camera_status",
    cameras: cameras,
  });

  clients.forEach((client) => {
    if (client.readyState === 1 && client.isSubscribed) {
      try {
        client.send(message);
      } catch (error) {
        console.error(
          "Error sending camera status to WebSocket client:",
          error,
        );
        clients.delete(client);
      }
    }
  });
}
