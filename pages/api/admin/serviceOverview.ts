import type { NextApiRequest, NextApiResponse } from "next";
import { getAllSuppliersAdmin } from "@/lib/data/suppliers";
import { getAllOfferings, getAllRegions } from "@/lib/data/masterData";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("📊 Fetching Service Overview data...");
  try {
    const [suppliers, offerings, regions] = await Promise.all([
      getAllSuppliersAdmin(),
      getAllOfferings(),
      getAllRegions(),
    ]);

    const offeringNameMap = new Map(offerings.map((offering) => [offering.id, offering.name]));
    const regionNameMap = new Map(regions.map((region) => [region.id, region.name]));

    const servicesSet = new Set<string>();
    const regionsSet = new Set<string>();

    suppliers.forEach((supplier) => {
      (supplier.offerings || []).forEach((offeringId) => {
        const name = offeringNameMap.get(offeringId) ?? offeringId;
        servicesSet.add(name);
      });

      const regionId = supplier.address?.regionId;
      if (regionId) {
        const name = regionNameMap.get(regionId) ?? regionId;
        regionsSet.add(name);
      }
    });

    const services = Array.from(servicesSet).sort((a, b) => a.localeCompare(b));
    const regionList = Array.from(regionsSet).sort((a, b) => a.localeCompare(b));

    res.status(200).json({ services, regions: regionList });
  } catch (error: any) {
    console.error("🔥 Error fetching service overview:", error);
    res.status(500).json({ error: "Failed to fetch service overview" });
  }
}

