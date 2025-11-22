import sql from "@/app/api/utils/sql";

// GET /api/detections - Get recent detections with optional filtering
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const camera_id = searchParams.get("camera_id");
    const limit = parseInt(searchParams.get("limit")) || 50;
    const hours = parseInt(searchParams.get("hours")) || 24;

    let query = `
      SELECT 
        d.id,
        d.camera_id,
        c.name as camera_name,
        d.detection_type,
        d.confidence,
        d.bbox_x1,
        d.bbox_y1,
        d.bbox_x2,
        d.bbox_y2,
        d.timestamp,
        d.processed
      FROM detections d
      JOIN cameras c ON d.camera_id = c.id
      WHERE d.timestamp >= NOW() - INTERVAL '${hours} hours'
    `;

    const values = [];
    let paramIndex = 1;

    if (camera_id) {
      query += ` AND d.camera_id = $${paramIndex}`;
      values.push(camera_id);
      paramIndex++;
    }

    query += ` ORDER BY d.timestamp DESC LIMIT $${paramIndex}`;
    values.push(limit);

    const detections = await sql(query, values);

    return Response.json({
      detections: detections.map((detection) => ({
        id: detection.id,
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
        timestamp: detection.timestamp,
        processed: detection.processed,
      })),
    });
  } catch (error) {
    console.error("Error fetching detections:", error);
    return Response.json(
      { error: "Failed to fetch detections" },
      { status: 500 },
    );
  }
}

// POST /api/detections - Store new detection from YOLO model
export async function POST(request) {
  try {
    const body = await request.json();
    const { camera_id, detections } = body;

    if (!camera_id || !Array.isArray(detections) || detections.length === 0) {
      return Response.json(
        {
          error: "camera_id and detections array are required",
        },
        { status: 400 },
      );
    }

    // Validate camera exists
    const [camera] = await sql`
      SELECT id FROM cameras WHERE id = ${camera_id}
    `;

    if (!camera) {
      return Response.json({ error: "Camera not found" }, { status: 404 });
    }

    // Insert multiple detections
    const insertedDetections = [];

    for (const detection of detections) {
      const { detection_type, confidence, bbox } = detection;

      if (
        !detection_type ||
        !confidence ||
        !Array.isArray(bbox) ||
        bbox.length !== 4
      ) {
        continue; // Skip invalid detections
      }

      const [inserted] = await sql`
        INSERT INTO detections (
          camera_id, 
          detection_type, 
          confidence, 
          bbox_x1, 
          bbox_y1, 
          bbox_x2, 
          bbox_y2
        )
        VALUES (
          ${camera_id},
          ${detection_type},
          ${confidence},
          ${bbox[0]},
          ${bbox[1]},
          ${bbox[2]},
          ${bbox[3]}
        )
        RETURNING *
      `;

      insertedDetections.push({
        id: inserted.id,
        camera_id: inserted.camera_id,
        detection_type: inserted.detection_type,
        confidence: parseFloat(inserted.confidence),
        bbox: [
          inserted.bbox_x1,
          inserted.bbox_y1,
          inserted.bbox_x2,
          inserted.bbox_y2,
        ],
        timestamp: inserted.timestamp,
      });
    }

    return Response.json(
      {
        message: `Stored ${insertedDetections.length} detections`,
        detections: insertedDetections,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error storing detections:", error);
    return Response.json(
      { error: "Failed to store detections" },
      { status: 500 },
    );
  }
}
