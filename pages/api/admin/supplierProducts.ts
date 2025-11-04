import type { NextApiRequest, NextApiResponse } from "next";
import {
  listSupplierProducts,
  upsertSupplierProduct,
  deleteSupplierProduct,
} from "@/lib/data/associations";
import type { SupplierProductLink } from "@/lib/types";

type ResponseData =
  | { success: true; message: string; data?: any }
  | { success: false; message: string; error?: string };

function parseLink(body: any): SupplierProductLink {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid payload");
  }
  const { supplierId, productId, offeringId } = body;
  if (!supplierId || !productId) {
    throw new Error("supplierId and productId are required");
  }
  const link: SupplierProductLink = {
    supplierId: String(supplierId),
    productId: String(productId),
  };
  if (offeringId) {
    link.offeringId = String(offeringId);
  }
  return link;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  try {
    if (req.method === "GET") {
      const supplierId = typeof req.query.supplierId === "string" ? req.query.supplierId : undefined;
      const data = await listSupplierProducts(supplierId);
      return res.status(200).json({ success: true, message: "✅ Supplier products loaded.", data });
    }

    if (req.method === "POST") {
      const link = parseLink(req.body);
      const data = await upsertSupplierProduct(link);
      return res.status(200).json({ success: true, message: "✅ Supplier product saved.", data });
    }

    if (req.method === "DELETE") {
      const link = parseLink(req.body);
      await deleteSupplierProduct(link);
      return res.status(200).json({ success: true, message: "✅ Supplier product removed." });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error: any) {
    console.error("🔥 supplierProducts API error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process supplier product request.",
      error: error?.message,
    });
  }
}

