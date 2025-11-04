import type { NextApiRequest, NextApiResponse } from "next";
import { getAllSuppliersAdmin } from "@/lib/data/suppliers";
import { getAllRegions } from "@/lib/data/masterData";

type RegionSummary = {
  region: string;
  supplierCount: number;
  counties: string[];
  zips: string[];
};

const normalizeZip = (zip?: string | null) => {
  if (!zip) return undefined;
  const cleaned = zip.toString().trim();
  if (!cleaned) return undefined;
  return cleaned.padStart(5, "0");
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const [suppliers, regions] = await Promise.all([getAllSuppliersAdmin(), getAllRegions()]);
    const regionMap = new Map(
      regions.map((region) => {
        const normalizedZips = region.zipCodes
          .map((zip) => normalizeZip(zip))
          .filter((value): value is string => Boolean(value));
        return [
          region.id,
          {
            name: region.name,
            counties: region.counties,
            zips: normalizedZips,
          },
        ];
      }),
    );

    const zipLookup = new Map<string, string>();
    regionMap.forEach((value, regionId) => {
      value.zips.forEach((zip) => {
        if (zip) zipLookup.set(zip, regionId);
      });
    });

    const summary = new Map<string, { supplierCount: number; counties: Set<string>; zips: Set<string> }>();
    let unknownCount = 0;

    suppliers.forEach((supplier) => {
      const zip = normalizeZip(supplier.address?.zip || supplier.address?.postalCode);
      const explicitRegion = supplier.address?.regionId || null;
      const derivedRegion = explicitRegion || (zip ? zipLookup.get(zip) || null : null);
      const regionRecord = derivedRegion ? regionMap.get(derivedRegion) : null;

      if (!derivedRegion || !regionRecord) {
        unknownCount++;
        return;
      }

      if (!summary.has(derivedRegion)) {
        summary.set(derivedRegion, {
          supplierCount: 0,
          counties: new Set<string>(),
          zips: new Set<string>(),
        });
      }

      const entry = summary.get(derivedRegion)!;
      entry.supplierCount += 1;
      if (supplier.address?.county) {
        entry.counties.add(supplier.address.county);
      }
      if (zip) {
        entry.zips.add(zip);
      }
    });

    const payload: RegionSummary[] = Array.from(summary.entries()).map(([regionId, value]) => {
      const regionRecord = regionMap.get(regionId);
      return {
        region: regionRecord?.name || regionId,
        supplierCount: value.supplierCount,
        counties: value.counties.size ? Array.from(value.counties).sort() : regionRecord?.counties || [],
        zips: value.zips.size ? Array.from(value.zips).sort() : regionRecord?.zips || [],
      };
    });

    if (unknownCount > 0) {
      payload.push({
        region: "Unknown",
        supplierCount: unknownCount,
        counties: [],
        zips: [],
      });
    }

    payload.sort((a, b) => b.supplierCount - a.supplierCount);

    return res.status(200).json({ regions: payload });
  } catch (error: any) {
    console.error("🔥 Error fetching regions:", error);
    return res.status(500).json({
      error: "Failed to load region overview data",
      details: error?.message,
    });
  }
}
