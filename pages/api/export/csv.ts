import { NextApiRequest, NextApiResponse } from "next";
import { getSupplierStats } from "@/lib/getSupplierStats";
import { Parser } from "json2csv";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const stats = await getSupplierStats();

    // Flatten suppliers list if needed
    const suppliers = stats.suppliers ?? [];

    // Prepare CSV
    const parser = new Parser({
      fields: [
        "name",
        "category",
        "location",
        "verified",
        "premium",
        "website",
        "createdAt",
      ],
    });

    const csv = parser.parse(suppliers);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=supplier_report.csv");
    res.status(200).send(csv);
  } catch (error) {
    console.error("Error exporting CSV:", error);
    res.status(500).json({ error: "Failed to export CSV" });
  }
}