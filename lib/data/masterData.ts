import { adminDb } from "@/lib/firebaseAdmin";
import type { CategoryRecord, OfferingRecord, ProductRecord, RegionRecord } from "@/lib/types";

export async function getAllCategories(): Promise<CategoryRecord[]> {
  const snapshot = await adminDb.collection("categories").get();
  return snapshot.docs.map((doc) => {
    const data = doc.data() ?? {};
    return {
      id: doc.id,
      name: data.name || doc.id,
      description: data.description || undefined,
    };
  });
}

export async function getAllOfferings(): Promise<OfferingRecord[]> {
  const snapshot = await adminDb.collection("offerings").get();
  return snapshot.docs.map((doc) => {
    const data = doc.data() ?? {};
    return {
      id: doc.id,
      name: data.name || doc.id,
      description: data.description || undefined,
      categoryId: data.categoryId,
    };
  });
}

export async function getAllProducts(): Promise<ProductRecord[]> {
  const snapshot = await adminDb.collection("products").get();
  return snapshot.docs.map((doc) => {
    const data = doc.data() ?? {};
    const offeringIds = Array.isArray(data.offeringIds)
      ? data.offeringIds.map((id: any) => String(id))
      : data.offeringId
      ? [String(data.offeringId)]
      : [];
    return {
      id: doc.id,
      name: data.name || doc.id,
      description: data.description || undefined,
      offeringIds,
    };
  });
}

export async function getAllRegions(): Promise<RegionRecord[]> {
  const snapshot = await adminDb.collection("regions").get();
  const regions: RegionRecord[] = [];

  for (const regionDoc of snapshot.docs) {
    const data = regionDoc.data() ?? {};

    if (data.zipCodes && Array.isArray(data.zipCodes)) {
      regions.push({
        id: regionDoc.id,
        name: data.name || regionDoc.id,
        state: data.state || "NY",
        counties: Array.isArray(data.counties) ? data.counties : [],
        zipCodes: data.zipCodes,
      });
      continue;
    }

    // Legacy format with nested /zips subcollection
    const zipsSnap = await regionDoc.ref.collection("zips").get();
    regions.push({
      id: regionDoc.id,
      name: data.name || regionDoc.id,
      state: data.state || "NY",
      counties: Array.isArray(data.counties) ? data.counties : [],
      zipCodes: zipsSnap.docs.map((zipDoc) => zipDoc.id),
    });
  }

  return regions;
}
