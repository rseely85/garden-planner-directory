import type { NextApiRequest, NextApiResponse } from "next";
import { getAllCategories, getAllOfferings, getAllProducts, getAllRegions } from "@/lib/data/masterData";
import { getSupplierSummaries } from "@/lib/data/suppliers";

type ResponseData =
  | {
      success: true;
      message: string;
      categories: any[];
      offerings: any[];
      products: any[];
      regions: any[];
      suppliers: Array<{ id: string; name: string }>;
    }
  | { success: false; message: string; error?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const [categories, offerings, products, regions, suppliers] = await Promise.all([
      getAllCategories(),
      getAllOfferings(),
      getAllProducts(),
      getAllRegions(),
      getSupplierSummaries(),
    ]);

    return res.status(200).json({
      success: true,
      message: "✅ Master data loaded.",
      categories,
      offerings,
      products,
      regions,
      suppliers,
    });
  } catch (error: any) {
    console.error("🔥 masterData API error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load master data.",
      error: error?.message,
    });
  }
}
