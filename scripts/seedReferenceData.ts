import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

type CategoryAggregate = {
  id: string;
  name: string;
};

type OfferingAggregate = {
  id: string;
  name: string;
  categoryId: string;
};

type ProductAggregate = {
  id: string;
  name: string;
  offeringIds: Set<string>;
};

type RegionAggregate = {
  id: string;
  name: string;
  state: string;
  counties: Set<string>;
  zipCodes: Set<string>;
};

const REGION_LOOKUP: Record<string, { id: string; name: string }> = {
  Erie: { id: "NY-WEST", name: "Western New York" },
  Niagara: { id: "NY-WEST", name: "Western New York" },
  Chautauqua: { id: "NY-WEST", name: "Western New York" },
  Cattaraugus: { id: "NY-WEST", name: "Western New York" },
  Allegany: { id: "NY-WEST", name: "Western New York" },

  Monroe: { id: "NY-FINGER-LAKES", name: "Finger Lakes" },
  Ontario: { id: "NY-FINGER-LAKES", name: "Finger Lakes" },
  Yates: { id: "NY-FINGER-LAKES", name: "Finger Lakes" },
  Seneca: { id: "NY-FINGER-LAKES", name: "Finger Lakes" },
  Wayne: { id: "NY-FINGER-LAKES", name: "Finger Lakes" },
  Livingston: { id: "NY-FINGER-LAKES", name: "Finger Lakes" },

  Onondaga: { id: "NY-CENTRAL", name: "Central New York" },
  Madison: { id: "NY-CENTRAL", name: "Central New York" },
  Oswego: { id: "NY-CENTRAL", name: "Central New York" },
  Cayuga: { id: "NY-CENTRAL", name: "Central New York" },
  Cortland: { id: "NY-CENTRAL", name: "Central New York" },
};

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

function readSuppliers(): any[] {
  const filePath = path.resolve(process.cwd(), "data", "suppliers.json");
  if (!fs.existsSync(filePath)) {
    throw new Error("data/suppliers.json not found.");
  }
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function readNyZipData(): Record<string, any> {
  const filePath = path.resolve(process.cwd(), "data", "regions", "geo-data.yaml");
  if (!fs.existsSync(filePath)) {
    console.warn("⚠️ geo-data.yaml not found; skipping ZIP import.");
    return {};
  }
  const raw = fs.readFileSync(filePath, "utf8");
  return (yaml.load(raw) as Record<string, any>) ?? {};
}

async function seed() {
  if (!getApps().length) {
    console.log("🌱 Initializing Firebase Admin (applicationDefault)");
    initializeApp({
      credential: applicationDefault(),
      projectId: process.env.GOOGLE_CLOUD_PROJECT || "garden-planner-directory",
    });
  }

  const db = getFirestore();
  const suppliers = readSuppliers();
  const nyZipData = readNyZipData();

  const categoryMap = new Map<string, CategoryAggregate>();
  const offeringMap = new Map<string, OfferingAggregate>();
  const productMap = new Map<string, ProductAggregate>();
  const regions: Record<string, RegionAggregate> = {};

  suppliers.forEach((supplier) => {
    const categoryId = supplier.category ? toSlug(supplier.category) : null;
    if (categoryId && !categoryMap.has(categoryId)) {
      categoryMap.set(categoryId, { id: categoryId, name: toTitle(supplier.category) });
    }

    const services: string[] = Array.isArray(supplier.services) ? supplier.services : [];
    const offeringsForSupplier: string[] = [];
    services.forEach((service: string) => {
      const offeringId = toSlug(service);
      if (!offeringId) return;
      offeringsForSupplier.push(offeringId);
      if (!offeringMap.has(offeringId)) {
        offeringMap.set(offeringId, {
          id: offeringId,
          name: toTitle(service),
          categoryId: categoryId || "uncategorized",
        });
      }
    });

    const products: string[] = Array.isArray(supplier.products) ? supplier.products : [];
    products.forEach((product) => {
      const productId = toSlug(product);
      if (!productId) return;
      if (!productMap.has(productId)) {
        productMap.set(productId, { id: productId, name: toTitle(product), offeringIds: new Set<string>() });
      }
      const aggregate = productMap.get(productId)!;
      offeringsForSupplier.forEach((offeringId) => aggregate.offeringIds.add(offeringId));
    });
  });

  Object.entries(nyZipData).forEach(([zip, entry]) => {
    const county: string | undefined = entry?.county || entry?.county_name;
    if (!county) return;
    const mapping = REGION_LOOKUP[county as keyof typeof REGION_LOOKUP];
    if (!mapping) return;
    if (!regions[mapping.id]) {
      regions[mapping.id] = {
        id: mapping.id,
        name: mapping.name,
        state: "NY",
        counties: new Set<string>(),
        zipCodes: new Set<string>(),
      };
    }
    regions[mapping.id].counties.add(county);
    regions[mapping.id].zipCodes.add(zip);
  });

  console.log(`📊 Writing ${categoryMap.size} categories...`);
  for (const category of categoryMap.values()) {
    await db.collection("categories").doc(category.id).set({ name: category.name }, { merge: true });
  }

  console.log(`📊 Writing ${offeringMap.size} offerings...`);
  for (const offering of offeringMap.values()) {
    await db
      .collection("offerings")
      .doc(offering.id)
      .set(
        {
          name: offering.name,
          categoryId: offering.categoryId,
        },
        { merge: true },
      );
  }

  console.log(`📊 Writing ${productMap.size} products...`);
  for (const product of productMap.values()) {
    await db
      .collection("products")
      .doc(product.id)
      .set(
        {
          name: product.name,
          offeringIds: Array.from(product.offeringIds),
        },
        { merge: true },
      );
  }

  console.log(`📊 Writing ${Object.keys(regions).length} regions...`);
  for (const region of Object.values(regions)) {
    await db
      .collection("regions")
      .doc(region.id)
      .set(
        {
          name: region.name,
          state: region.state,
          counties: Array.from(region.counties),
          zipCodes: Array.from(region.zipCodes),
        },
        { merge: true },
      );
  }

  console.log("✅ Reference data seeding complete.");
}

if (require.main === module) {
  seed()
    .then(() => {
      console.log("🎉 Seeding succeeded.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("🔥 Seeding failed:", error);
      process.exit(1);
    });
}

