// Test endpoint untuk cek YOLO model integration
export async function GET() {
  try {
    // Check if YOLO environment variables are set
    const yoloScriptPath = process.env.YOLO_SCRIPT_PATH;
    const yoloModelPath = process.env.YOLO_MODEL_PATH;

    if (!yoloScriptPath || !yoloModelPath) {
      return Response.json({
        success: false,
        message: "YOLO environment variables not set",
        missing: {
          YOLO_SCRIPT_PATH: !yoloScriptPath,
          YOLO_MODEL_PATH: !yoloModelPath,
        },
        instructions: [
          "Set YOLO_SCRIPT_PATH to your Python script path",
          "Set YOLO_MODEL_PATH to your .pt model file path",
          "Example: YOLO_SCRIPT_PATH=/home/user/yolo_inference.py",
        ],
      });
    }

    // Check if files exist (basic check)
    const fs = require("fs");
    const path = require("path");

    const scriptExists = fs.existsSync(yoloScriptPath);
    const modelExists = fs.existsSync(yoloModelPath);

    return Response.json({
      success: scriptExists && modelExists,
      environment: {
        YOLO_SCRIPT_PATH: yoloScriptPath,
        YOLO_MODEL_PATH: yoloModelPath,
        script_exists: scriptExists,
        model_exists: modelExists,
      },
      next_steps:
        scriptExists && modelExists
          ? [
              "Run: curl -X POST /api/test/simulate-detection",
              "Check dashboard for real-time updates",
              "Connect to camera feeds for live detection",
            ]
          : [
              "Make sure Python script exists and is executable",
              "Verify model file (.pt) is accessible",
              "Test Python script manually first",
            ],
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
