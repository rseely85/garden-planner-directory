import { getAllSuppliersAdmin } from "@/lib/data/suppliers";
import { getAllCategories, getAllOfferings, getAllProducts, getAllRegions } from "@/lib/data/masterData";

export const getAdminStats = async () => {
  const [suppliers, categoryRecords, offeringRecords, productRecords, regionRecords] = await Promise.all([
    getAllSuppliersAdmin(),
    getAllCategories(),
    getAllOfferings(),
    getAllProducts(),
    getAllRegions(),
  ]);

  const categoryNameMap = new Map(categoryRecords.map((category) => [category.id, category.name]));
  const offeringNameMap = new Map(offeringRecords.map((offering) => [offering.id, offering.name]));
  const productNameMap = new Map(productRecords.map((product) => [product.id, product.name]));
  const regionNameMap = new Map(regionRecords.map((region) => [region.id, region.name]));

  const totalSuppliers = suppliers.length;
  let verifiedCount = 0;
  let premiumCount = 0;
  const categories = new Set<string>();
  const offerings = new Set<string>();
  const products = new Set<string>();
  const regions = new Set<string>();
  const updatedDates: Date[] = [];
  let missingZipCount = 0;

  suppliers.forEach((supplier) => {
    if (supplier.verified === true) verifiedCount++;
    if (supplier.premium === true) premiumCount++;

    (supplier.categories || []).forEach((categoryId) => categories.add(categoryId));
    (supplier.offerings || []).forEach((offeringId) => offerings.add(offeringId));
    (supplier.products || []).forEach((productId) => products.add(productId));

    const regionId = supplier.address?.regionId;
    if (regionId) {
      regions.add(regionId);
    }
    if (!supplier.address?.zip) {
      missingZipCount++;
    }

    if (supplier.updatedAt) {
      const parsed = new Date(supplier.updatedAt);
      if (!Number.isNaN(parsed.getTime())) updatedDates.push(parsed);
    }
  });

  const lastUpdated =
    updatedDates.length > 0
      ? new Date(Math.max(...updatedDates.map((d) => d.getTime()))).toISOString()
      : new Date().toISOString();

  return {
    totalSuppliers,
    verifiedCount,
    premiumCount,
    categories: Array.from(categories).map((id) => categoryNameMap.get(id) ?? id),
    services: Array.from(offerings).map((id) => offeringNameMap.get(id) ?? id),
    products: Array.from(products).map((id) => productNameMap.get(id) ?? id),
    regions: Array.from(regions).map((id) => regionNameMap.get(id) ?? id),
    lastUpdated,
    activeRegions: regions.size,
    missingZips: missingZipCount,
  };
};
