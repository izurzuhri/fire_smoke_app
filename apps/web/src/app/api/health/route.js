import sql from "@/app/api/utils/sql";

// GET /api/health - System health check
export async function GET() {
  try {
    // Check database connection
    const [dbCheck] = await sql`SELECT NOW() as current_time`;

    // Get system status
    const cameras = await sql`
      SELECT 
        COUNT(*) as total_cameras,
        COUNT(CASE WHEN status = 'online' THEN 1 END) as online_cameras
      FROM cameras
    `;

    const detections = await sql`
      SELECT 
        COUNT(*) as total_detections,
        COUNT(CASE WHEN timestamp >= NOW() - INTERVAL '24 hours' THEN 1 END) as recent_detections
      FROM detections
    `;

    const status = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: {
        connected: !!dbCheck,
        current_time: dbCheck?.current_time,
      },
      cameras: {
        total: parseInt(cameras[0]?.total_cameras) || 0,
        online: parseInt(cameras[0]?.online_cameras) || 0,
      },
      detections: {
        total: parseInt(detections[0]?.total_detections) || 0,
        last_24h: parseInt(detections[0]?.recent_detections) || 0,
      },
      yolo_integration: {
        script_path: process.env.YOLO_SCRIPT_PATH || null,
        model_path: process.env.YOLO_MODEL_PATH || null,
        status:
          process.env.YOLO_SCRIPT_PATH && process.env.YOLO_MODEL_PATH
            ? "configured"
            : "using_mock",
      },
    };

    return Response.json(status);
  } catch (error) {
    console.error("Health check failed:", error);
    return Response.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error.message,
      },
      { status: 503 },
    );
  }
}
