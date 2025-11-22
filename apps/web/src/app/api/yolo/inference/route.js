import { spawn } from "child_process";
import { broadcastDetection } from "../../ws/route.js";
import sql from "@/app/api/utils/sql";

// POST /api/yolo/inference - Run YOLO inference on image/frame
export async function POST(request) {
  try {
    const body = await request.json();
    const { camera_id, image_data, image_path } = body;

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

    let detections;

    // Check if YOLO Python script exists, otherwise use mock
    const useRealYolo =
      process.env.YOLO_SCRIPT_PATH && process.env.YOLO_MODEL_PATH;

    if (useRealYolo) {
      // Call real YOLO Python script
      detections = await runRealYoloInference(
        camera_id,
        image_data,
        image_path,
      );
    } else {
      // Use mock detections for development/demo
      detections = generateMockDetections(camera_id);
    }

    // Store detections in database
    if (detections.length > 0) {
      const storedDetections = [];

      for (const detection of detections) {
        const [stored] = await sql`
          INSERT INTO detections (
            camera_id, 
            detection_type, 
            confidence, 
            bbox_x1, bbox_y1, bbox_x2, bbox_y2
          )
          VALUES (
            ${camera_id},
            ${detection.detection_type},
            ${detection.confidence},
            ${detection.bbox[0]},
            ${detection.bbox[1]},
            ${detection.bbox[2]},
            ${detection.bbox[3]}
          )
          RETURNING *
        `;

        const formattedDetection = {
          id: stored.id,
          camera_id: stored.camera_id,
          camera_name: camera.name,
          detection_type: stored.detection_type,
          confidence: parseFloat(stored.confidence),
          bbox: [
            stored.bbox_x1,
            stored.bbox_y1,
            stored.bbox_x2,
            stored.bbox_y2,
          ],
          timestamp: stored.timestamp,
        };

        storedDetections.push(formattedDetection);

        // Broadcast to WebSocket clients
        broadcastDetection(formattedDetection);
      }

      return Response.json({
        message: `Found ${detections.length} detections`,
        detections: storedDetections,
        using_real_yolo: useRealYolo,
      });
    }

    return Response.json({
      message: "No detections found",
      detections: [],
      using_real_yolo: useRealYolo,
    });
  } catch (error) {
    console.error("Error running YOLO inference:", error);
    return Response.json({ error: "Inference failed" }, { status: 500 });
  }
}

// Run actual YOLO Python script
async function runRealYoloInference(camera_id, image_data, image_path) {
  return new Promise((resolve, reject) => {
    const scriptPath = process.env.YOLO_SCRIPT_PATH;
    const modelPath = process.env.YOLO_MODEL_PATH;

    // Prepare arguments for Python script
    const args = [scriptPath, "--model", modelPath, "--camera_id", camera_id];

    if (image_path) {
      args.push("--image_path", image_path);
    }

    const python = spawn("python3", args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let output = "";
    let error = "";

    // Send image data to Python script stdin if provided
    if (image_data) {
      python.stdin.write(JSON.stringify({ image_data }));
      python.stdin.end();
    }

    python.stdout.on("data", (data) => {
      output += data.toString();
    });

    python.stderr.on("data", (data) => {
      error += data.toString();
    });

    python.on("close", (code) => {
      if (code === 0) {
        try {
          // Parse JSON output from Python script
          const result = JSON.parse(output);
          resolve(result.detections || []);
        } catch (parseError) {
          console.error("Error parsing YOLO output:", parseError);
          resolve([]);
        }
      } else {
        console.error("YOLO script error:", error);
        reject(new Error(`YOLO script failed with code ${code}`));
      }
    });

    python.on("error", (err) => {
      console.error("Error spawning YOLO script:", err);
      reject(err);
    });
  });
}

// Generate mock detections for development
function generateMockDetections(camera_id) {
  // Sometimes return no detections
  if (Math.random() > 0.3) {
    return [];
  }

  const detections = [];
  const numDetections = Math.floor(Math.random() * 3) + 1; // 1-3 detections

  for (let i = 0; i < numDetections; i++) {
    const detectionType = Math.random() > 0.6 ? "fire" : "smoke";
    const confidence = 0.6 + Math.random() * 0.4; // 0.6-1.0

    detections.push({
      detection_type: detectionType,
      confidence: Math.round(confidence * 1000) / 1000, // 3 decimal places
      bbox: [
        Math.floor(Math.random() * 300), // x1
        Math.floor(Math.random() * 200), // y1
        Math.floor(Math.random() * 300) + 300, // x2
        Math.floor(Math.random() * 200) + 200, // y2
      ],
    });
  }

  return detections;
}
