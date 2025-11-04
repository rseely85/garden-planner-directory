import type { NextApiRequest, NextApiResponse } from "next";
import {
  listSupplierOfferings,
  upsertSupplierOffering,
  deleteSupplierOffering,
} from "@/lib/data/associations";
import type { SupplierOfferingLink } from "@/lib/types";

type ResponseData =
  | { success: true; message: string; data?: any }
  | { success: false; message: string; error?: string };

function parseLink(body: any): SupplierOfferingLink {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid payload");
  }
  const { supplierId, offeringId } = body;
  if (!supplierId || !offeringId) {
    throw new Error("supplierId and offeringId are required");
  }
  return { supplierId: String(supplierId), offeringId: String(offeringId) };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  try {
    if (req.method === "GET") {
      const supplierId = typeof req.query.supplierId === "string" ? req.query.supplierId : undefined;
      const data = await listSupplierOfferings(supplierId);
      return res.status(200).json({ success: true, message: "✅ Supplier offerings loaded.", data });
    }

    if (req.method === "POST") {
      const link = parseLink(req.body);
      const data = await upsertSupplierOffering(link);
      return res.status(200).json({ success: true, message: "✅ Supplier offering saved.", data });
    }

    if (req.method === "DELETE") {
      const link = parseLink(req.body);
      await deleteSupplierOffering(link);
      return res.status(200).json({ success: true, message: "✅ Supplier offering removed." });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error: any) {
    console.error("🔥 supplierOfferings API error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process supplier offering request.",
      error: error?.message,
    });
  }
}

