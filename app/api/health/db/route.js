import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    const sql = getSql();
    await sql`SELECT 1`;
    return Response.json({ database: "ok" }, { headers });
  } catch (error) {
    // Details stay in the server logs; the public response reveals nothing.
    console.error("Database health check failed:", error.message);
    return Response.json({ database: "error" }, { status: 503, headers });
  }
}
