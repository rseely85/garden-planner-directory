import { getAllSuppliersAdmin } from "@/lib/data/suppliers";
import { getAllRegions, getAllCategories, getAllOfferings, getAllProducts } from "@/lib/data/masterData";

const toIsoString = (value: any): string | null => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value.toDate === "function") {
    try {
      return value.toDate().toISOString();
    } catch (err) {
      return null;
    }
  }
  return null;
};

const normalizeZip = (zip?: string | null) => {
  if (!zip) return undefined;
  const cleaned = zip.toString().trim();
  if (!cleaned) return undefined;
  return cleaned.padStart(5, "0");
};

const toTitle = (value: string) =>
  value
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");

export async function getSupplierStats() {
  console.log("📊 Running Firestore stats fetch...");
  const [supplierViews, regionRecords, categoryRecords, offeringRecords, productRecords] = await Promise.all([
    getAllSuppliersAdmin(),
    getAllRegions(),
    getAllCategories(),
    getAllOfferings(),
    getAllProducts(),
  ]);

  const categoryNameMap = new Map(categoryRecords.map((category) => [category.id, category.name]));
  const offeringNameMap = new Map(offeringRecords.map((offering) => [offering.id, offering.name]));
  const productNameMap = new Map(productRecords.map((product) => [product.id, product.name]));

  const zipToRegion = new Map<string, string>();
  const regionNameMap = new Map<string, string>();
  regionRecords.forEach((region) => {
    regionNameMap.set(region.id, region.name);
    region.zipCodes.forEach((zip) => {
      const normalized = normalizeZip(zip);
      if (normalized) {
        zipToRegion.set(normalized, region.id);
      }
    });
  });

  const suppliers = supplierViews.map((supplier) => {
    const missingFields: string[] = [];
    const categoryIds = supplier.categories ?? [];
    const offeringIds = supplier.offerings ?? [];
    const productIds = supplier.products ?? [];
    const categoryLabels = categoryIds.map((id) => categoryNameMap.get(id) ?? toTitle(id));
    const offeringLabels = offeringIds.map((id) => offeringNameMap.get(id) ?? toTitle(id));
    const productLabels = productIds.map((id) => productNameMap.get(id) ?? toTitle(id));
    if (!supplier.name) missingFields.push("name");
    if (!supplier.email) missingFields.push("email");
    if (supplier.verified === undefined) missingFields.push("verifiedFlagMissing");
    if (supplier.premium === undefined) missingFields.push("premiumFlagMissing");

    if (!categoryIds.length) {
      missingFields.push("categories");
    }
    if (!offeringIds.length) {
      missingFields.push("offerings");
    }
    if (!productIds.length) {
      missingFields.push("products");
    }

    const address = supplier.address;
    const zip = normalizeZip(address?.zip);
    if (!address?.city || !address?.state) {
      missingFields.push("address");
    }
    if (!zip) {
      missingFields.push("zip");
    }

    const recordedRegionId = address?.regionId || null;
    const recordedRegionName = recordedRegionId ? regionNameMap.get(recordedRegionId) ?? null : null;
    if (!recordedRegionId) {
      missingFields.push("regionId");
    }

    let regionMismatch = false;
    if (zip && recordedRegionId) {
      const derivedRegionId = zipToRegion.get(zip);
      if (derivedRegionId && derivedRegionId !== recordedRegionId) {
        regionMismatch = true;
        missingFields.push("regionMismatch");
      }
    }
    const derivedRegionId = zip ? zipToRegion.get(zip) ?? null : null;
    const derivedRegionName = derivedRegionId ? regionNameMap.get(derivedRegionId) ?? null : null;

    const primaryCategoryId = supplier.category ?? supplier.categories?.[0] ?? null;
    const primaryCategoryLabel = primaryCategoryId ? categoryNameMap.get(primaryCategoryId) ?? toTitle(primaryCategoryId) : null;

    const createdAt = supplier.createdAt ?? null;
    const updatedAt = supplier.updatedAt ?? null;
    const lastUpdated = supplier.lastUpdated ?? updatedAt ?? createdAt ?? null;

    return {
      id: supplier.id,
      slug: supplier.slug,
      name: supplier.name,
      category: primaryCategoryId,
      categoryLabel: primaryCategoryLabel,
      categories: categoryIds,
      categoryLabels,
      offerings: offeringIds,
      offeringLabels,
      products: productIds,
      productLabels,
      email: supplier.email || null,
      verified: Boolean(supplier.verified),
      premium: Boolean(supplier.premium),
      location: supplier.location || undefined,
      regionId: recordedRegionId,
      regionName: recordedRegionName,
      derivedRegionId,
      derivedRegionName,
      regionMismatch,
      missingFields,
      createdAt,
      updatedAt,
      lastUpdated,
      raw: supplier,
    };
  });

  const verifiedCount = suppliers.filter((s) => s.verified === true).length;
  const premiumCount = suppliers.filter((s) => s.premium === true).length;

  const locationCounts = suppliers.reduce((acc, s) => {
    if (s.location) {
      acc[s.location] = (acc[s.location] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const missingFieldsCount = suppliers.reduce((acc, s) => {
    s.missingFields.forEach(field => {
      acc[field] = (acc[field] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const lastUpdatedDates = suppliers
    .map(s => s.lastUpdated)
    .filter((date): date is string => typeof date === "string")
    .map(date => new Date(date));

  const lastUpdatedStats = {
    mostRecent: lastUpdatedDates.length ? new Date(Math.max(...lastUpdatedDates.map(d => d.getTime()))) : null,
    oldest: lastUpdatedDates.length ? new Date(Math.min(...lastUpdatedDates.map(d => d.getTime()))) : null,
  };

  return {
    totalSuppliers: suppliers.length,
    verifiedCount,
    premiumCount,
    locationCounts,
    missingFieldsCount,
    lastUpdatedStats,
    suppliers,
  };
}
