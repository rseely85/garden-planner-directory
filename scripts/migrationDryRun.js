const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
let db = null;
let firestoreAvailable = true;
try {
  const admin = require("firebase-admin");
  if (!admin.apps.length) {
    console.log("🌱 Initializing Firebase Admin (applicationDefault)");
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.GOOGLE_CLOUD_PROJECT || "garden-planner-directory",
    });
  }
  db = admin.firestore();
} catch (error) {
  firestoreAvailable = false;
  console.warn("⚠️ Firebase Admin not available; falling back to local seed data.", error.message);
}

function toSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function loadNyZipData() {
  const filePath = path.resolve(process.cwd(), "data", "regions", "geo-data.yaml");
  if (!fs.existsSync(filePath)) {
    console.warn("⚠️ geo-data.yaml not found; skipping ZIP aggregation.");
    return {};
  }
  const raw = fs.readFileSync(filePath, "utf8");
  return yaml.load(raw) || {};
}

const REGION_LOOKUP = [
  { id: "NY-WEST", counties: ["Erie", "Niagara", "Chautauqua", "Cattaraugus", "Allegany"] },
  { id: "NY-FINGER-LAKES", counties: ["Monroe", "Ontario", "Yates", "Seneca", "Wayne", "Livingston", "Genesee"] },
  { id: "NY-CENTRAL", counties: ["Onondaga", "Madison", "Oswego", "Cayuga", "Cortland"] },
  { id: "NY-CAPITAL", counties: ["Albany", "Saratoga", "Schenectady", "Rensselaer", "Columbia"] },
  { id: "NY-SOUTHERN-TIER", counties: ["Tompkins", "Chemung", "Broome", "Tioga", "Steuben"] },
  { id: "NY-MOHAWK", counties: ["Oneida", "Herkimer", "Fulton", "Montgomery", "Otsego"] },
  { id: "NY-NORTH", counties: ["Clinton", "Franklin", "Jefferson", "St. Lawrence", "Lewis"] },
  { id: "NY-MID-HUDSON", counties: ["Rockland", "Westchester", "Orange", "Putnam", "Dutchess", "Ulster", "Sullivan"] },
  { id: "NY-LONG-ISLAND", counties: ["Suffolk", "Nassau"] },
  { id: "NY-NYC", counties: ["Queens", "Kings", "Bronx", "New York", "Richmond"] },
];

function resolveRegion(county) {
  if (!county) return null;
  const normalized = county.trim().toLowerCase();
  const match = REGION_LOOKUP.find((region) =>
    region.counties.some((c) => c.toLowerCase() === normalized),
  );
  return match ? match.id : null;
}

async function loadSuppliers() {
  if (db) {
    try {
      const snap = await db.collection("suppliers").get();
      if (!snap.empty) {
        return snap.docs.map((doc) => ({ id: doc.id, data: doc.data() || {} }));
      }
      console.warn("⚠️ Firestore has no supplier documents. Falling back to local seed file.");
    } catch (error) {
      console.warn("⚠️ Firestore unavailable; using local seed file instead.", error.message);
    }
  }

  const seedPath = path.resolve(process.cwd(), "data", "suppliers.json");
  if (!fs.existsSync(seedPath)) {
    throw new Error("Local seed file data/suppliers.json not found.");
  }
  const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
  return seed.map((supplier) => ({
    id: supplier.id || supplier.slug,
    data: supplier,
  }));
}

async function main() {
  console.log("🔍 Performing migration dry run (read-only)...");
  const [supplierDocs, nyZipData] = await Promise.all([loadSuppliers(), loadNyZipData()]);

  if (!supplierDocs.length) {
    console.warn("⚠️ No suppliers found in Firestore or local seed. Nothing to migrate.");
    return;
  }

  const categories = new Map();
  const offerings = new Map();
  const products = new Map();
  const supplierSummaries = [];
  const regionZips = new Map();

  Object.entries(nyZipData).forEach(([zip, entry]) => {
    const county = entry?.county || entry?.county_name;
    const regionId = resolveRegion(county);
    if (!regionId) return;
    if (!regionZips.has(regionId)) {
      regionZips.set(regionId, { zipCount: 0, counties: new Set() });
    }
    const info = regionZips.get(regionId);
    info.zipCount += 1;
    if (county) info.counties.add(county);
  });

  supplierDocs.forEach((doc) => {
    const data = doc.data || {};
    const supplierId = doc.id;
    const categoryRaw = data.category || data.primaryCategory;
    const services = Array.isArray(data.services)
      ? data.services
      : typeof data.services === "string"
      ? [data.services]
      : [];
    const productList = Array.isArray(data.products)
      ? data.products
      : typeof data.products === "string"
      ? [data.products]
      : [];

    if (categoryRaw) {
      const categoryId = toSlug(categoryRaw);
      categories.set(categoryId, categoryRaw);
    }

    services.forEach((service) => {
      const offeringId = toSlug(service);
      if (!offerings.has(offeringId)) {
        offerings.set(offeringId, { name: service, category: categoryRaw || "uncategorized" });
      }
    });

    productList.forEach((product) => {
      const productId = toSlug(product);
      if (!products.has(productId)) {
        products.set(productId, { name: product, offerings: new Set() });
      }
      services.forEach((service) => {
        products.get(productId).offerings.add(toSlug(service));
      });
    });

    const county = data.address?.county;
    const regionId = resolveRegion(county);
    supplierSummaries.push({
      supplierId,
      name: data.name,
      category: categoryRaw || null,
      serviceCount: services.length,
      productCount: productList.length,
      county: county || null,
      regionId,
    });
  });

  console.log("📋 Dry Run Summary");
  console.log(`  Suppliers scanned: ${supplierSummaries.length}`);
  console.log(`  Categories detected: ${categories.size}`);
  console.log(`  Offerings detected: ${offerings.size}`);
  console.log(`  Products detected: ${products.size}`);

  console.log("\n🗂 Categories:");
  categories.forEach((name, id) => {
    console.log(`    - ${id}: ${name}`);
  });

  console.log("\n🧾 Offerings (category → offering):");
  offerings.forEach((info, id) => {
    console.log(`    - ${info.category || "uncategorized"} → ${id} (${info.name})`);
  });

  console.log("\n📦 Products (product → offerings count):");
  products.forEach((info, id) => {
    console.log(`    - ${id} (${info.name}) → offerings linked: ${info.offerings.size}`);
  });

  console.log("\n🌍 Region assignments:");
  supplierSummaries.forEach((summary) => {
    console.log(
      `    - ${summary.supplierId}: county=${summary.county || "N/A"} → region=${summary.regionId || "unmapped"}`,
    );
  });

  console.log("\n📮 Region ZIP coverage (from geo-data.yaml):");
  regionZips.forEach((info, regionId) => {
    console.log(`    - ${regionId}: ZIPs=${info.zipCount}, counties=${Array.from(info.counties).join(", ")}`);
  });

  console.log("\n✅ Dry run complete. No data was modified.");
}

main().catch((err) => {
  console.error("🔥 Dry run failed:", err);
  process.exit(1);
});
