

import { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin } from "../../../lib/firebaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("📊 Fetching Service Overview data...");
  try {
    const db = getFirebaseAdmin().firestore();
    const snapshot = await db.collection("suppliers").get();

    if (snapshot.empty) {
      console.warn("⚠️ No suppliers found in Firestore.");
      return res.status(200).json({ services: [], regions: [] });
    }

    const servicesSet = new Set<string>();
    const regionsSet = new Set<string>();

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (Array.isArray(data.services)) {
        data.services.forEach((s: string) => servicesSet.add(s.trim()));
      } else if (typeof data.services === "string") {
        servicesSet.add(data.services.trim());
      }

      if (Array.isArray(data.regions)) {
        data.regions.forEach((r: string) => regionsSet.add(r.trim()));
      } else if (typeof data.regions === "string") {
        regionsSet.add(data.regions.trim());
      }
    });

    const services = Array.from(servicesSet).sort();
    const regions = Array.from(regionsSet).sort();

    res.status(200).json({ services, regions });
  } catch (error) {
    console.error("🔥 Error fetching service overview:", error);
    res.status(500).json({ error: "Failed to fetch service overview" });
  }
}