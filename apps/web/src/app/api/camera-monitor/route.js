import sql from "@/app/api/utils/sql";
import { broadcastCameraStatus } from "../ws/route.js";

// Store active monitoring processes
const monitoringProcesses = new Map();

// GET /api/camera-monitor - Get monitoring status
export async function GET() {
  try {
    const cameras = await sql`
      SELECT id, name, status, rtsp_url, file_path FROM cameras ORDER BY id
    `;

    const status = {
      total_cameras: cameras.length,
      online_cameras: cameras.filter((c) => c.status === "online").length,
      monitoring_processes: monitoringProcesses.size,
      cameras: cameras.map((cam) => ({
        id: cam.id,
        name: cam.name,
        status: cam.status,
        has_source: !!(cam.rtsp_url || cam.file_path),
        is_monitoring: monitoringProcesses.has(cam.id),
      })),
    };

    return Response.json(status);
  } catch (error) {
    console.error("Error getting monitor status:", error);
    return Response.json({ error: "Failed to get status" }, { status: 500 });
  }
}

// POST /api/camera-monitor - Start/stop camera monitoring
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, camera_id } = body;

    if (!action || !camera_id) {
      return Response.json(
        {
          error: "action and camera_id are required",
        },
        { status: 400 },
      );
    }

    const [camera] = await sql`
      SELECT * FROM cameras WHERE id = ${camera_id}
    `;

    if (!camera) {
      return Response.json({ error: "Camera not found" }, { status: 404 });
    }

    if (action === "start") {
      if (monitoringProcesses.has(camera_id)) {
        return Response.json({
          message: "Camera monitoring already running",
          camera_id,
        });
      }

      // Start monitoring process
      const process = startCameraMonitoring(camera);
      monitoringProcesses.set(camera_id, process);

      // Update camera status to online
      await sql`
        UPDATE cameras 
        SET status = 'online', updated_at = NOW() 
        WHERE id = ${camera_id}
      `;

      return Response.json({
        message: "Camera monitoring started",
        camera_id,
      });
    } else if (action === "stop") {
      const process = monitoringProcesses.get(camera_id);
      if (process) {
        clearInterval(process.intervalId);
        monitoringProcesses.delete(camera_id);
      }

      // Update camera status to offline
      await sql`
        UPDATE cameras 
        SET status = 'offline', updated_at = NOW() 
        WHERE id = ${camera_id}
      `;

      return Response.json({
        message: "Camera monitoring stopped",
        camera_id,
      });
    } else {
      return Response.json(
        {
          error: 'Invalid action. Use "start" or "stop"',
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error controlling camera monitor:", error);
    return Response.json({ error: "Monitor control failed" }, { status: 500 });
  }
}

// Start monitoring a specific camera
function startCameraMonitoring(camera) {
  console.log(`Starting monitoring for camera: ${camera.id} (${camera.name})`);

  const intervalId = setInterval(async () => {
    try {
      // Simulate frame capture and inference
      // In real implementation, this would:
      // 1. Capture frame from RTSP stream or read from file
      // 2. Call YOLO inference endpoint
      // 3. Process results

      const useSimulation = !process.env.YOLO_SCRIPT_PATH;

      if (useSimulation) {
        // Simulate processing with random chance of detection
        if (Math.random() > 0.8) {
          // 20% chance of detection per cycle
          await simulateInference(camera.id);
        }
      } else {
        // Call real YOLO inference
        await processRealFrame(camera);
      }
    } catch (error) {
      console.error(`Error monitoring camera ${camera.id}:`, error);

      // If too many errors, stop monitoring and mark camera offline
      if (error.consecutive_errors > 5) {
        console.log(
          `Stopping monitoring for camera ${camera.id} due to repeated errors`,
        );
        clearInterval(intervalId);
        monitoringProcesses.delete(camera.id);

        await sql`
          UPDATE cameras 
          SET status = 'offline', updated_at = NOW() 
          WHERE id = ${camera.id}
        `;
      }
    }
  }, 3000); // Check every 3 seconds

  return { intervalId, camera_id: camera.id };
}

// Simulate inference for development
async function simulateInference(camera_id) {
  try {
    // Call our inference endpoint with mock data
    const response = await fetch(
      `${process.env.APP_URL || "http://localhost:3000"}/api/yolo/inference`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          camera_id: camera_id,
          image_data: "mock_frame_data",
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Inference failed: ${response.status}`);
    }

    const result = await response.json();
    console.log(
      `Simulated inference for ${camera_id}: ${result.detections?.length || 0} detections`,
    );
  } catch (error) {
    console.error(`Error in simulated inference for ${camera_id}:`, error);
  }
}

// Process real frame from camera
async function processRealFrame(camera) {
  try {
    let frameData = null;

    if (camera.rtsp_url) {
      // TODO: Implement RTSP frame capture
      // This would use ffmpeg or opencv to capture a frame from RTSP stream
      frameData = await captureRTSPFrame(camera.rtsp_url);
    } else if (camera.file_path) {
      // TODO: Implement file frame reading
      // This would read frames from video file
      frameData = await readFileFrame(camera.file_path);
    }

    if (frameData) {
      // Call YOLO inference endpoint
      const response = await fetch(
        `${process.env.APP_URL || "http://localhost:3000"}/api/yolo/inference`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            camera_id: camera.id,
            image_data: frameData,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Inference failed: ${response.status}`);
      }

      const result = await response.json();
      console.log(
        `Real inference for ${camera.id}: ${result.detections?.length || 0} detections`,
      );
    }
  } catch (error) {
    console.error(`Error processing real frame for ${camera.id}:`, error);
    throw error;
  }
}

// TODO: Implement RTSP frame capture
async function captureRTSPFrame(rtsp_url) {
  // Placeholder - would use ffmpeg or opencv to capture frame
  console.log(`Would capture frame from RTSP: ${rtsp_url}`);
  return null;
}

// TODO: Implement file frame reading
async function readFileFrame(file_path) {
  // Placeholder - would read frame from video file
  console.log(`Would read frame from file: ${file_path}`);
  return null;
}
