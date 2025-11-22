import sql from "@/app/api/utils/sql";

// GET /api/cameras - List all cameras with recent detection counts
export async function GET() {
  try {
    // Get cameras with detection counts from last 24 hours
    const cameras = await sql`
      SELECT 
        c.id,
        c.name,
        c.rtsp_url,
        c.file_path,
        c.status,
        c.created_at,
        c.updated_at,
        COUNT(d.id) as recent_detections,
        COUNT(CASE WHEN d.detection_type = 'fire' THEN 1 END) as recent_fire,
        COUNT(CASE WHEN d.detection_type = 'smoke' THEN 1 END) as recent_smoke
      FROM cameras c
      LEFT JOIN detections d ON c.id = d.camera_id 
        AND d.timestamp >= NOW() - INTERVAL '24 hours'
      GROUP BY c.id, c.name, c.rtsp_url, c.file_path, c.status, c.created_at, c.updated_at
      ORDER BY c.created_at
    `;

    return Response.json({
      cameras: cameras.map((cam) => ({
        id: cam.id,
        name: cam.name,
        rtsp_url: cam.rtsp_url,
        file_path: cam.file_path,
        status: cam.status,
        recent_detections: parseInt(cam.recent_detections),
        recent_fire: parseInt(cam.recent_fire),
        recent_smoke: parseInt(cam.recent_smoke),
        created_at: cam.created_at,
        updated_at: cam.updated_at,
      })),
    });
  } catch (error) {
    console.error("Error fetching cameras:", error);
    return Response.json({ error: "Failed to fetch cameras" }, { status: 500 });
  }
}

// POST /api/cameras - Create new camera
export async function POST(request) {
  try {
    const body = await request.json();
    const { id, name, rtsp_url, file_path } = body;

    if (!id || !name) {
      return Response.json(
        { error: "Camera ID and name are required" },
        { status: 400 },
      );
    }

    const [camera] = await sql`
      INSERT INTO cameras (id, name, rtsp_url, file_path, status)
      VALUES (${id}, ${name}, ${rtsp_url || null}, ${file_path || null}, 'offline')
      RETURNING *
    `;

    return Response.json({ camera }, { status: 201 });
  } catch (error) {
    console.error("Error creating camera:", error);
    if (error.code === "23505") {
      // Unique constraint violation
      return Response.json(
        { error: "Camera ID already exists" },
        { status: 400 },
      );
    }
    return Response.json({ error: "Failed to create camera" }, { status: 500 });
  }
}
