import { NextApiRequest, NextApiResponse } from "next";
import { getSupplierStats } from "@/lib/getSupplierStats";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const stats = await getSupplierStats();
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=supplier_report.json");
    res.status(200).send(JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error("Error exporting JSON:", error);
    res.status(500).json({ error: "Failed to export JSON" });
  }
}