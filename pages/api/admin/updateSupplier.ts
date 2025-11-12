import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/firebaseAdmin";

console.log("🛠 updateSupplier API route triggered");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const { id, updates } = req.body;
    console.log("📩 Incoming update request:", { id, updates });

    if (!id || !updates) {
      return res.status(400).json({ success: false, message: "Missing supplier ID or update data" });
    }

    if (!db) {
      console.error("❌ Firestore instance not initialized");
      return res.status(500).json({ success: false, message: "Firestore not initialized" });
    }

    // Clean out only undefined fields; allow null so callers can clear values explicitly
    const cleanedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    console.log("🧹 Cleaned update fields:", cleanedUpdates);

    const supplierRef = db.collection("suppliers").doc(id);
    const supplierDoc = await supplierRef.get();

    if (!supplierDoc.exists) {
      console.error(`⚠️ Supplier not found for ID: ${id}`);
      return res.status(404).json({ success: false, message: `Supplier ${id} not found` });
    }

    await supplierRef.update(cleanedUpdates);
    console.log(`✅ Supplier ${id} updated successfully`);

    return res.status(200).json({
      success: true,
      message: `Supplier ${id} updated successfully`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("🔥 Error in updateSupplier API:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating supplier",
      error: message,
      stack,
    });
  }
}
