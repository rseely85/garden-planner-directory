import type { NextApiRequest, NextApiResponse } from "next";
import { getAllSuppliersAdmin } from "@/lib/data/suppliers";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const suppliers = await getAllSuppliersAdmin();
    res.status(200).json({ success: true, suppliers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching suppliers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch supplier data.",
      error: message,
    });
  }
}
