import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { pathToFileURL } from "url";
import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

type RegionConfig = {
  id: string;
  name: string;
  state: string;
  counties: string[];
};

type RegionAggregate = {
  id: string;
  name: string;
  state: string;
  counties: Set<string>;
  zipCodes: Set<string>;
};

type CategoryAggregate = {
  id: string;
  name: string;
  description?: string;
};

type OfferingAggregate = {
  id: string;
  name: string;
  categoryId: string;
  description?: string;
};

type ProductAggregate = {
  id: string;
  name: string;
  description?: string;
  offeringIds: Set<string>;
};

type SupplierAggregate = {
  id: string;
  slug: string;
  name: string;
  categoryId?: string | null;
  offeringIds: string[];
  productIds: string[];
  address?: {
    street?: string;
    city?: string;
    county?: string;
    state?: string;
    zip?: string;
  };
};

const REGION_LOOKUP: RegionConfig[] = [
  { id: "NY-WEST", name: "Western New York", state: "NY", counties: ["Erie", "Niagara", "Chautauqua", "Cattaraugus", "Allegany"] },
  { id: "NY-FINGER-LAKES", name: "Finger Lakes", state: "NY", counties: ["Monroe", "Ontario", "Yates", "Seneca", "Wayne", "Livingston", "Genesee"] },
  { id: "NY-CENTRAL", name: "Central New York", state: "NY", counties: ["Onondaga", "Madison", "Oswego", "Cayuga", "Cortland"] },
  { id: "NY-CAPITAL", name: "Capital Region", state: "NY", counties: ["Albany", "Saratoga", "Schenectady", "Rensselaer", "Columbia"] },
  { id: "NY-SOUTHERN-TIER", name: "Southern Tier", state: "NY", counties: ["Tompkins", "Chemung", "Broome", "Tioga", "Steuben"] },
  { id: "NY-MOHAWK", name: "Mohawk Valley", state: "NY", counties: ["Oneida", "Herkimer", "Fulton", "Montgomery", "Otsego"] },
  { id: "NY-NORTH", name: "North Country", state: "NY", counties: ["Clinton", "Franklin", "Jefferson", "St. Lawrence", "Lewis"] },
  { id: "NY-MID-HUDSON", name: "Mid-Hudson", state: "NY", counties: ["Rockland", "Westchester", "Orange", "Putnam", "Dutchess", "Ulster", "Sullivan"] },
  { id: "NY-LONG-ISLAND", name: "Long Island", state: "NY", counties: ["Suffolk", "Nassau"] },
  { id: "NY-NYC", name: "New York City", state: "NY", counties: ["Queens", "Kings", "Bronx", "New York", "Richmond"] },
];

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function toTitle(value: string): string {
  return value
    .split(/[-_\s]+/)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function resolveRegionByCounty(countyRaw?: string): RegionConfig | null {
  if (!countyRaw) return null;
  const county = countyRaw.trim().toLowerCase();
  return (
    REGION_LOOKUP.find((region) =>
      region.counties.some((entry) => entry.toLowerCase() === county),
    ) ?? null
  );
}

function loadNyZipData(): Record<string, any> {
  const filePath = path.resolve(process.cwd(), "data", "regions", "geo-data.yaml");
  if (!fs.existsSync(filePath)) {
    console.warn("⚠️ geo-data.yaml not found; skipping ZIP seeding.");
    return {};
  }
  const fileContents = fs.readFileSync(filePath, "utf8");
  return (yaml.load(fileContents) as Record<string, any>) ?? {};
}

async function migrate() {
  if (!getApps().length) {
    console.log("🌱 Initializing Firebase Admin (applicationDefault)");
    initializeApp({
      credential: applicationDefault(),
      projectId: process.env.GOOGLE_CLOUD_PROJECT || "garden-planner-directory",
    });
  }

  const db = getFirestore();
  const dryRun = process.env.MIGRATION_DRY_RUN === "1" || process.env.DRY_RUN === "1";
  if (dryRun) {
    console.log("🧪 Running in DRY RUN mode — no writes will be committed.");
  }
  console.log("📦 Loading suppliers...");
  const suppliersSnap = await db.collection("suppliers").get();

  if (suppliersSnap.empty) {
    console.warn("⚠️ No suppliers found; nothing to migrate.");
    return;
  }

  const categoryMap = new Map<string, CategoryAggregate>();
  const offeringMap = new Map<string, OfferingAggregate>();
  const productMap = new Map<string, ProductAggregate>();
  const supplierAggregates: SupplierAggregate[] = [];

  const supplierCategoryLinks: { supplierId: string; categoryId: string }[] = [];
  const supplierOfferingLinks: { supplierId: string; offeringId: string }[] = [];
  const supplierProductLinks: { supplierId: string; productId: string; offeringId?: string }[] = [];

  const regions: Record<string, RegionAggregate> = {};
  const nyZipData = loadNyZipData();

  Object.entries(nyZipData).forEach(([zip, entry]) => {
    const county: string | undefined = entry?.county || entry?.county_name;
    const regionMatch = resolveRegionByCounty(county);
    if (!regionMatch) return;

    if (!regions[regionMatch.id]) {
      regions[regionMatch.id] = {
        id: regionMatch.id,
        name: regionMatch.name,
        state: regionMatch.state,
        counties: new Set<string>(),
        zipCodes: new Set<string>(),
      };
    }

    regions[regionMatch.id].counties.add(entry.county);
    regions[regionMatch.id].zipCodes.add(zip);
  });

  for (const doc of suppliersSnap.docs) {
    const data = doc.data() ?? {};
    const supplierId = doc.id;
    const slug = typeof data.slug === "string" && data.slug ? data.slug : toSlug(data.name || supplierId);
    const categoryRaw = data.category || data.primaryCategory;
    const services: string[] = Array.isArray(data.services)
      ? data.services
      : typeof data.services === "string"
      ? [data.services]
      : [];
    const products: string[] = Array.isArray(data.products)
      ? data.products
      : typeof data.products === "string"
      ? [data.products]
      : [];

    const normalizedCategoryId = categoryRaw ? toSlug(String(categoryRaw)) : null;

    if (normalizedCategoryId) {
      if (!categoryMap.has(normalizedCategoryId)) {
        categoryMap.set(normalizedCategoryId, {
          id: normalizedCategoryId,
          name: toTitle(String(categoryRaw)),
        });
      }
      supplierCategoryLinks.push({ supplierId, categoryId: normalizedCategoryId });
    }

    const supplierOfferingIds: string[] = [];
    services.forEach((service) => {
      const offeringId = toSlug(service);
      if (!offeringId) return;
      supplierOfferingIds.push(offeringId);
      if (!offeringMap.has(offeringId)) {
        offeringMap.set(offeringId, {
          id: offeringId,
          name: toTitle(service),
          categoryId: normalizedCategoryId || "uncategorized",
        });
      }
      supplierOfferingLinks.push({ supplierId, offeringId });
    });

    const supplierProductIds: string[] = [];
    products.forEach((product) => {
      const productId = toSlug(product);
      if (!productId) return;
      supplierProductIds.push(productId);
      if (!productMap.has(productId)) {
        productMap.set(productId, {
          id: productId,
          name: toTitle(product),
          offeringIds: new Set<string>(),
        });
      }
      const aggregate = productMap.get(productId)!;
      supplierOfferingIds.forEach((offeringId) => aggregate.offeringIds.add(offeringId));
      if (!supplierOfferingIds.length && normalizedCategoryId) {
        // Fallback: tie product to a synthetic offering derived from the category
        const fallbackOfferingId = `${normalizedCategoryId}-general`;
        aggregate.offeringIds.add(fallbackOfferingId);
        if (!offeringMap.has(fallbackOfferingId)) {
          offeringMap.set(fallbackOfferingId, {
            id: fallbackOfferingId,
            name: `${toTitle(categoryRaw)} General`,
            categoryId: normalizedCategoryId,
          });
        }
        supplierOfferingLinks.push({ supplierId, offeringId: fallbackOfferingId });
        supplierOfferingIds.push(fallbackOfferingId);
      }

      if (supplierOfferingIds.length) {
        supplierOfferingIds.forEach((offeringId) => {
          supplierProductLinks.push({ supplierId, productId, offeringId });
        });
      } else {
        supplierProductLinks.push({ supplierId, productId });
      }
    });

    const supplierAddress = data.address || {};
    const county = supplierAddress?.county;
    const regionMatch = resolveRegionByCounty(county);
    const zip = supplierAddress?.zip ? String(supplierAddress.zip) : undefined;

    if (regionMatch) {
      if (!regions[regionMatch.id]) {
        regions[regionMatch.id] = {
          id: regionMatch.id,
          name: regionMatch.name,
          state: regionMatch.state,
          counties: new Set<string>(),
          zipCodes: new Set<string>(),
        };
      }
      if (county) regions[regionMatch.id].counties.add(county);
      if (zip) regions[regionMatch.id].zipCodes.add(zip);
    }

    supplierAggregates.push({
      id: supplierId,
      slug,
      name: data.name || "(missing name)",
      categoryId: normalizedCategoryId,
      offeringIds: supplierOfferingIds,
      productIds: supplierProductIds,
      address: {
        street: supplierAddress?.street,
        city: supplierAddress?.city,
        county,
        state: supplierAddress?.state,
        zip,
      },
    });
  }

  console.log(`📊 Aggregated ${categoryMap.size} categories, ${offeringMap.size} offerings, ${productMap.size} products.`);

  // Write categories
  for (const category of categoryMap.values()) {
    if (dryRun) {
      console.log(`[DRY RUN] Would upsert category ${category.id} (${category.name})`);
      continue;
    }
    await db.collection("categories").doc(category.id).set({
      name: category.name,
      description: category.description || FieldValue.delete(),
    }, { merge: true });
  }

  // Write offerings
  for (const offering of offeringMap.values()) {
    if (dryRun) {
      console.log(`[DRY RUN] Would upsert offering ${offering.id} (${offering.name}) -> ${offering.categoryId}`);
      continue;
    }
    await db.collection("offerings").doc(offering.id).set({
      name: offering.name,
      description: offering.description || FieldValue.delete(),
      categoryId: offering.categoryId,
    }, { merge: true });
  }

  // Write products
  for (const product of productMap.values()) {
    if (dryRun) {
      console.log(`[DRY RUN] Would upsert product ${product.id} (${product.name}) -> offerings: ${Array.from(product.offeringIds).join(", ")}`);
      continue;
    }
    await db.collection("products").doc(product.id).set({
      name: product.name,
      description: product.description || FieldValue.delete(),
      offeringIds: Array.from(product.offeringIds),
    }, { merge: true });
  }

  // Write regions
  for (const region of Object.values(regions)) {
    if (dryRun) {
      console.log(`[DRY RUN] Would upsert region ${region.id} (${region.name}) with ${region.zipCodes.size} ZIPs.`);
      continue;
    }
    await db.collection("regions").doc(region.id).set({
      name: region.name,
      state: region.state,
      counties: Array.from(region.counties),
      zipCodes: Array.from(region.zipCodes),
    }, { merge: true });
  }

  // Write association links
  for (const link of supplierCategoryLinks) {
    const docId = `${link.supplierId}_${link.categoryId}`;
    if (dryRun) {
      console.log(`[DRY RUN] Would link supplier ${link.supplierId} -> category ${link.categoryId}`);
      continue;
    }
    await db.collection("supplierCategories").doc(docId).set(link, { merge: true });
  }

  for (const link of supplierOfferingLinks) {
    const docId = `${link.supplierId}_${link.offeringId}`;
    if (dryRun) {
      console.log(`[DRY RUN] Would link supplier ${link.supplierId} -> offering ${link.offeringId}`);
      continue;
    }
    await db.collection("supplierOfferings").doc(docId).set(link, { merge: true });
  }

  for (const link of supplierProductLinks) {
    const docId = `${link.supplierId}_${link.productId}_${link.offeringId || "any"}`;
    if (dryRun) {
      console.log(`[DRY RUN] Would link supplier ${link.supplierId} -> product ${link.productId} (offering: ${link.offeringId || "none"})`);
      continue;
    }
    await db.collection("supplierProducts").doc(docId).set(link, { merge: true });
  }

  // Update supplier docs
  for (const supplier of supplierAggregates) {
    const updates: Record<string, any> = {
      slug: supplier.slug,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (supplier.address) {
      updates["address.city"] = supplier.address.city || FieldValue.delete();
      updates["address.county"] = supplier.address.county || FieldValue.delete();
      updates["address.state"] = supplier.address.state || FieldValue.delete();
      updates["address.street"] = supplier.address.street || FieldValue.delete();
      updates["address.zip"] = supplier.address.zip || FieldValue.delete();
    }

    const regionConfig = resolveRegionByCounty(supplier.address?.county);
    if (regionConfig) {
      updates["address.regionId"] = regionConfig.id;
    }

    if (dryRun) {
      console.log(`[DRY RUN] Would update supplier ${supplier.id} (${supplier.slug})`);
      continue;
    }
    await db.collection("suppliers").doc(supplier.id).set(updates, { merge: true });
  }

  console.log(dryRun ? "✅ Dry run complete. No data was modified." : "✅ Migration complete.");
}

export async function runMigration() {
  await migrate();
}

const isDirectExecution = (() => {
  try {
    const entry = process.argv[1];
    if (!entry) return false;
    const entryUrl = pathToFileURL(path.resolve(entry)).href;
    return import.meta.url === entryUrl;
  } catch {
    return false;
  }
})();

if (isDirectExecution) {
  runMigration()
    .then(() => {
      console.log("🎉 Normalized data model migration finished.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("🔥 Migration failed:", error);
      process.exit(1);
    });
}
