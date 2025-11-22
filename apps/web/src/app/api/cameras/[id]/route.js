import sql from "@/app/api/utils/sql";

// GET /api/cameras/[id] - Get specific camera
export async function GET(request, { params }) {
  try {
    const { id } = params;

    const [camera] = await sql`
      SELECT * FROM cameras WHERE id = ${id}
    `;

    if (!camera) {
      return Response.json({ error: "Camera not found" }, { status: 404 });
    }

    return Response.json({ camera });
  } catch (error) {
    console.error("Error fetching camera:", error);
    return Response.json({ error: "Failed to fetch camera" }, { status: 500 });
  }
}

// PATCH /api/cameras/[id] - Update camera status or configuration
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, rtsp_url, file_path, status } = body;

    // Build dynamic update query
    let setClause = [];
    let values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      setClause.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }
    if (rtsp_url !== undefined) {
      setClause.push(`rtsp_url = $${paramIndex}`);
      values.push(rtsp_url);
      paramIndex++;
    }
    if (file_path !== undefined) {
      setClause.push(`file_path = $${paramIndex}`);
      values.push(file_path);
      paramIndex++;
    }
    if (status !== undefined) {
      setClause.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (setClause.length === 0) {
      return Response.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    setClause.push(`updated_at = NOW()`);
    values.push(id); // for WHERE clause

    const query = `
      UPDATE cameras 
      SET ${setClause.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const [camera] = await sql(query, values);

    if (!camera) {
      return Response.json({ error: "Camera not found" }, { status: 404 });
    }

    return Response.json({ camera });
  } catch (error) {
    console.error("Error updating camera:", error);
    return Response.json({ error: "Failed to update camera" }, { status: 500 });
  }
}

// DELETE /api/cameras/[id] - Delete camera and its detections
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    // Delete in transaction to ensure consistency
    await sql.transaction([
      sql`DELETE FROM detections WHERE camera_id = ${id}`,
      sql`DELETE FROM cameras WHERE id = ${id}`,
    ]);

    return Response.json({ message: "Camera deleted successfully" });
  } catch (error) {
    console.error("Error deleting camera:", error);
    return Response.json({ error: "Failed to delete camera" }, { status: 500 });
  }
}
