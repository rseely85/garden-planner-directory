import type { NextApiRequest, NextApiResponse } from "next";
import { getAllSuppliersAdmin } from "@/lib/data/suppliers";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const suppliers = await getAllSuppliersAdmin();
    return res.status(200).json({ success: true, suppliers });
  } catch (error: any) {
    console.error("❌ Firestore error fetching suppliers:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch suppliers.",
      error: error?.message,
    });
  }
}
