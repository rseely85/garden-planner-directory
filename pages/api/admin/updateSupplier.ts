import { getFirestore } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

const adminApp = getFirebaseAdmin();
const db = getFirestore(adminApp);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const { id, updates } = req.body;

    if (!id || !updates) {
      return res.status(400).json({ success: false, message: "Missing supplier ID or update data" });
    }

    // Clean undefined or null fields
    const cleanedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined && v !== null)
    );

    // Merge or create document safely
    await db.collection("suppliers").doc(id).set(cleanedUpdates, { merge: true });

    return res.status(200).json({
      success: true,
      message: `Supplier ${id} updated successfully`,
    });
  } catch (error) {
    console.error("Error updating supplier:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating supplier",
      error: error.message,
    });
  }
}