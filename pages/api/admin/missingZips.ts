import type { NextApiRequest, NextApiResponse } from "next";
import { getFirestore } from "firebase-admin/firestore";
import "@/lib/firebaseAdmin";

type Resp = { ids: string[]; count: number; details?: { id: string; zip?: string; name?: string }[] };

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resp | { error: string }>) {
  try {
    const db = getFirestore();

    // Load valid NY ZIPs from regions/NY/zips
    const regionDoc = db.collection("regions").doc("NY").collection("zips");
    const zipsSnap = await regionDoc.get();
    if (zipsSnap.empty) {
      console.warn("⚠️ No region ZIP data found — returning empty result.");
      return res.status(200).json({ ids: [], count: 0 });
    }

    const validZips = new Set(zipsSnap.docs.map((d) => d.id.toString().trim().toUpperCase()));

    // Read all suppliers
    const supSnap = await db.collection("suppliers").get();
    const badIds: string[] = [];
    const badDetails: { id: string; zip?: string; name?: string }[] = [];

    supSnap.forEach((doc) => {
      const data = doc.data() as any;
      const zip = data?.address?.zip?.toString().trim().toUpperCase();
      const name = data?.name || "(unknown)";
      if (!zip || !validZips.has(zip)) {
        badIds.push(doc.id);
        badDetails.push({ id: doc.id, zip, name });
        if (process.env.NODE_ENV === "development") {
          console.warn(`⚠️ Invalid ZIP: ${zip || "(missing)"} for supplier ${name} (${doc.id})`);
        }
      }
    });

    console.log(`📊 Checked ${supSnap.size} suppliers — found ${badIds.length} with missing or invalid ZIPs.`);

    res.status(200).json({ ids: badIds, count: badIds.length, details: badDetails });
  } catch (err: any) {
    console.error("❌ missingZips error:", err);
    res.status(500).json({ error: "Failed to find missing zips" });
  }
}