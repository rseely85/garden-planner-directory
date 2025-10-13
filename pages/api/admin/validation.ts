import type { NextApiRequest, NextApiResponse } from "next";
import { getSupplierStats } from "../../../lib/getSupplierStats";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    console.log("🔍 Running supplier validation check...");

    const { incompleteSuppliers } = await getSupplierStats();

    console.log(`✅ Validation complete — ${incompleteSuppliers.length} incomplete suppliers found.`);

    return res.status(200).json({
      status: "success",
      totalIncomplete: incompleteSuppliers.length,
      incompleteSuppliers,
    });
  } catch (error: any) {
    console.error("🔥 Validation API error:", error.message);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch incomplete supplier data",
      details: error.message,
    });
  }
}