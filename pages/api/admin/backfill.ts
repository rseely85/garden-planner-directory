import type { NextApiRequest, NextApiResponse } from "next";
import { backfillSupplierLocations } from "@/lib/backfillSupplierLocations";

/**
 * Admin API — Backfill missing supplier location strings.
 * Calls the Firestore logic from lib/backfillSupplierLocations.ts
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow GET or POST only
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    console.log("⚙️ API: Running Firestore backfill...");
    const result = await backfillSupplierLocations();

    return res.status(200).json({
      success: result.success,
      message: result.message,
      updatedCount: result.updatedCount,
      skippedCount: result.skippedCount,
      updates: result.updates || [],
    });
  } catch (error: any) {
    console.error("🔥 API backfill error:", error.message);
    return res.status(500).json({
      success: false,
      message: `Internal Server Error: ${error.message}`,
    });
  }
}