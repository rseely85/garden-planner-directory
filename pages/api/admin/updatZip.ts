import type { NextApiRequest, NextApiResponse } from "next";
import { getFirestore } from "firebase-admin/firestore";
import { firebaseApp } from "@/lib/firebaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id, zip } = req.body as { id?: string; zip?: string };
    if (!id || !zip) {
      return res.status(400).json({ error: "id and zip are required" });
    }

    const db = getFirestore(firebaseApp);

    await db.collection("suppliers").doc(id).update({ "address.zip": zip.toString().trim() });

    res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update ZIP";
    console.error("updateZip error:", error);
    res.status(500).json({ error: message });
  }
}
