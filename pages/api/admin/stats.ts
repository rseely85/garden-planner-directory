import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminStats } from "@/lib/stats";

/**
 * Admin API — Generate Supplier Stats
 * Wraps lib/getSupplierStats.ts for use via browser or dashboard.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow GET or POST only
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    console.log("⚙️ API: Fetching Admin Stats...");
    const stats = await getAdminStats();

    return res.status(200).json({
      success: true,
      message: "✅ Admin stats generated successfully.",
      totalSuppliers: stats.totalSuppliers,
      verifiedCount: stats.verifiedCount,
      premiumCount: stats.premiumCount,
      categories: stats.categories,
      services: stats.services,
      regions: stats.regions,
      lastUpdated: stats.lastUpdated,
    });
  } catch (error: any) {
    console.error("🔥 API stats error:", error.message);
    return res.status(500).json({
      success: false,
      message: `Internal Server Error: ${error.message}`,
    });
  }
}