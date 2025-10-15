import type { NextApiRequest, NextApiResponse } from "next";
import { getSupplierStats } from "../../../lib/getSupplierStats";

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
    console.log("⚙️ API: Fetching Supplier Stats...");
    const stats = await getSupplierStats();

    return res.status(200).json({
      success: true,
      message: "✅ Supplier stats generated successfully.",
      totalSuppliers: stats.totalSuppliers,
      verifiedCount: stats.verifiedCount,
      premiumCount: stats.premiumCount,
      incompleteSuppliers: stats.incompleteSuppliers,
      suppliers: stats.suppliers,
    });
  } catch (error: any) {
    console.error("🔥 API stats error:", error.message);
    return res.status(500).json({
      success: false,
      message: `Internal Server Error: ${error.message}`,
    });
  }
}