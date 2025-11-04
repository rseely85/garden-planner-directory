import type { NextApiRequest, NextApiResponse } from "next";
import {
  listSupplierCategories,
  upsertSupplierCategory,
  deleteSupplierCategory,
} from "@/lib/data/associations";
import type { SupplierCategoryLink } from "@/lib/types";

type ResponseData =
  | { success: true; message: string; data?: any }
  | { success: false; message: string; error?: string };

function parseLink(body: any): SupplierCategoryLink {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid payload");
  }
  const { supplierId, categoryId } = body;
  if (!supplierId || !categoryId) {
    throw new Error("supplierId and categoryId are required");
  }
  return { supplierId: String(supplierId), categoryId: String(categoryId) };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  try {
    if (req.method === "GET") {
      const supplierId = typeof req.query.supplierId === "string" ? req.query.supplierId : undefined;
      const data = await listSupplierCategories(supplierId);
      return res.status(200).json({ success: true, message: "✅ Supplier categories loaded.", data });
    }

    if (req.method === "POST") {
      const link = parseLink(req.body);
      const data = await upsertSupplierCategory(link);
      return res.status(200).json({ success: true, message: "✅ Supplier category saved.", data });
    }

    if (req.method === "DELETE") {
      const link = parseLink(req.body);
      await deleteSupplierCategory(link);
      return res.status(200).json({ success: true, message: "✅ Supplier category removed." });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error: any) {
    console.error("🔥 supplierCategories API error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process supplier category request.",
      error: error?.message,
    });
  }
}

