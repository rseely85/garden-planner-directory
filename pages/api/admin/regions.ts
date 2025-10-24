

import { NextApiRequest, NextApiResponse } from "next";
import { getFirestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  console.log("🔥 Initializing Firebase Admin via applicationDefault...");
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = getFirestore();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log("📍 Fetching regional supplier overview...");

    // Load NY ZIP → region mapping using batched reads
    async function fetchAllZips() {
      const regionsRef = db.collection("regions").doc("NY").collection("zips");
      const zipToRegion: Record<string, { county: string; city: string }> = {};
      let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
      let totalCount = 0;

      while (true) {
        let query = regionsRef.limit(300);
        if (lastDoc) query = query.startAfter(lastDoc);
        const snapshot = await query.get();
        if (snapshot.empty) break;

        snapshot.forEach((doc) => {
          const data = doc.data();
          zipToRegion[doc.id] = { county: data.county || "", city: data.city || "" };
        });

        totalCount += snapshot.size;
        console.log(`📦 Loaded ${totalCount} ZIP docs so far...`);
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
        if (snapshot.size < 300) break;
      }

      return zipToRegion;
    }

    const zipToRegion = await fetchAllZips();
    if (Object.keys(zipToRegion).length === 0) {
      return res.status(404).json({ error: "No ZIP data found for NY regions." });
    }

    // Fetch suppliers and assign by region
    const suppliersRef = db.collection("suppliers");
    const suppliersSnap = await suppliersRef.get();

    const regionCounts: Record<
      string,
      { supplierCount: number; counties: Set<string>; zips: string[] }
    > = {};

    suppliersSnap.forEach((doc) => {
      const supplier = doc.data();
      // Supplier ZIPs are sometimes nested in address or numeric, so normalize to string
      const zipValue = supplier.address?.zip ?? supplier.zip ?? "";
      const zip = typeof zipValue === "number" ? String(zipValue) : String(zipValue).trim();

      const regionInfo = zipToRegion[zip];
      if (!regionInfo) return; // skip suppliers not in NY

      // Temporary region mapping by county (later can link to static YAML)
      let region = "Unknown Region";
      const county = regionInfo.county.toLowerCase();

      if (["erie", "niagara", "chautauqua", "cattaraugus"].includes(county))
        region = "Western New York";
      else if (["monroe", "ontario", "yates", "seneca", "wayne"].includes(county))
        region = "Finger Lakes";
      else if (["onondaga", "madison", "oswego"].includes(county))
        region = "Central New York";
      else if (["albany", "rensselaer", "schenectady", "saratoga"].includes(county))
        region = "Capital Region";
      else if (["tompkins", "chemung", "broome", "tioga"].includes(county))
        region = "Southern Tier";
      else if (["oneida", "herkimer", "fulton"].includes(county))
        region = "Mohawk Valley";
      else if (["clinton", "franklin", "jefferson", "st. lawrence"].includes(county))
        region = "North Country";
      else if (["rockland", "westchester", "orange", "putnam"].includes(county))
        region = "Mid-Hudson";
      else if (["suffolk", "nassau"].includes(county))
        region = "Long Island";
      else if (["queens", "kings", "bronx", "new york", "richmond"].includes(county))
        region = "New York City";

      if (!regionCounts[region]) {
        regionCounts[region] = {
          supplierCount: 0,
          counties: new Set(),
          zips: [],
        };
      }

      regionCounts[region].supplierCount += 1;
      regionCounts[region].counties.add(regionInfo.county);
      regionCounts[region].zips.push(zip);
    });

    const response = Object.entries(regionCounts).map(([region, data]) => ({
      region,
      supplierCount: data.supplierCount,
      counties: Array.from(data.counties),
      zips: data.zips,
    }));

    res.status(200).json({ regions: response });
  } catch (error: any) {
    console.error("🔥 Error fetching regions:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}