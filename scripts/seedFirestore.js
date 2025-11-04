const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const REGION_LOOKUP = [
  { id: "NY-WEST", name: "Western New York", counties: ["Erie", "Niagara", "Chautauqua", "Cattaraugus", "Allegany"] },
  { id: "NY-FINGER-LAKES", name: "Finger Lakes", counties: ["Monroe", "Ontario", "Yates", "Seneca", "Wayne", "Livingston", "Genesee"] },
  { id: "NY-CENTRAL", name: "Central New York", counties: ["Onondaga", "Madison", "Oswego", "Cayuga", "Cortland"] },
  { id: "NY-CAPITAL", name: "Capital Region", counties: ["Albany", "Saratoga", "Schenectady", "Rensselaer", "Columbia"] },
  { id: "NY-SOUTHERN-TIER", name: "Southern Tier", counties: ["Tompkins", "Chemung", "Broome", "Tioga", "Steuben"] },
  { id: "NY-MOHAWK", name: "Mohawk Valley", counties: ["Oneida", "Herkimer", "Fulton", "Montgomery", "Otsego"] },
  { id: "NY-NORTH", name: "North Country", counties: ["Clinton", "Franklin", "Jefferson", "St. Lawrence", "Lewis"] },
  { id: "NY-MID-HUDSON", name: "Mid-Hudson", counties: ["Rockland", "Westchester", "Orange", "Putnam", "Dutchess", "Ulster", "Sullivan"] },
  { id: "NY-LONG-ISLAND", name: "Long Island", counties: ["Suffolk", "Nassau"] },
  { id: "NY-NYC", name: "New York City", counties: ["Queens", "Kings", "Bronx", "New York", "Richmond"] },
];

function ensureAdmin() {
  if (!admin.apps.length) {
    console.log("🌱 Initializing Firebase Admin (applicationDefault)");
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.GOOGLE_CLOUD_PROJECT || "garden-planner-directory",
    });
  }
  return admin.firestore();
}

function loadJSON(fileName) {
  const filePath = path.resolve(process.cwd(), "data", fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing data file: ${fileName}`);
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

function loadNyZipData() {
  const filePath = path.resolve(process.cwd(), "data", "regions", "geo-data.yaml");
  if (!fs.existsSync(filePath)) {
    console.warn("⚠️ geo-data.yaml not found. ZIP → region matching will rely on county only.");
    return {};
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  return yaml.load(raw) || {};
}

function toSlug(value = "") {
  return value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function toTitle(value = "") {
  return value
    .toString()
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function buildFullAddress(address = {}) {
  const parts = [
    address.street,
    address.city,
    address.county ? `${address.county} County` : null,
    address.state,
    address.zip || address.postalCode,
  ].filter((part) => typeof part === "string" && part.trim() !== "");
  return parts.join(", ");
}

function normalizeZip(zip) {
  if (!zip) return undefined;
  const cleaned = zip.toString().trim();
  if (!cleaned) return undefined;
  return cleaned.padStart(5, "0");
}

function resolveRegionByCounty(county) {
  if (!county || typeof county !== "string") return null;
  const normalized = county.trim().toLowerCase();
  const match = REGION_LOOKUP.find((region) =>
    region.counties.some((candidate) => candidate.toLowerCase() === normalized),
  );
  return match ? match.id : null;
}

async function replaceSupplierLinks(db, collectionName, supplierId, payloads, buildId) {
  const snapshot = await db.collection(collectionName).where("supplierId", "==", supplierId).get();
  const batch = db.batch();
  snapshot.forEach((doc) => batch.delete(doc.ref));
  payloads.forEach((payload) => {
    const docId = buildId(payload);
    batch.set(db.collection(collectionName).doc(docId), payload);
  });
  await batch.commit();
}

async function seed() {
  const db = ensureAdmin();

  const suppliersData = loadJSON("suppliers.json");
  const catalogData = loadJSON("productsCatalog.json");
  const nyZipData = loadNyZipData();

  const catalogMap = new Map();
  catalogData.forEach((entry) => {
    if (entry?.name) {
      const slug = toSlug(entry.name);
      catalogMap.set(slug, entry);
    }
  });

  const zipToRegion = new Map();
  const regionAggregates = new Map();

  Object.entries(nyZipData).forEach(([zip, info]) => {
    const county = info?.county || info?.county_name;
    const regionConfig = resolveRegionByCounty(county);
    if (!regionConfig) return;

    const regionMeta = REGION_LOOKUP.find((region) => region.id === regionConfig);
    if (!regionAggregates.has(regionConfig)) {
      regionAggregates.set(regionConfig, {
        id: regionConfig,
        name: regionMeta?.name || regionConfig,
        state: "NY",
        counties: new Set(),
        zipCodes: new Set(),
      });
    }

    const aggregate = regionAggregates.get(regionConfig);
    if (county) aggregate.counties.add(county);
    aggregate.zipCodes.add(normalizeZip(zip));
    zipToRegion.set(normalizeZip(zip), regionConfig);
  });

  const categories = new Map();
  const offerings = new Map();
  const products = new Map();

  const supplierRecords = [];

  for (const rawSupplier of suppliersData) {
    const name = rawSupplier.name || "(unknown supplier)";
    const slug = rawSupplier.slug || toSlug(name);
    const supplierId = slug;

    const supplierCategoryIds = new Set();
    const supplierOfferingIds = new Set();
    const supplierProductEntries = new Set();

    const categoryId = rawSupplier.category ? toSlug(rawSupplier.category) : null;
    if (categoryId) {
      const categoryName = toTitle(rawSupplier.category);
      categories.set(categoryId, { id: categoryId, name: categoryName });
      supplierCategoryIds.add(categoryId);
    }

    const services = Array.isArray(rawSupplier.services) ? rawSupplier.services : [];
    services.forEach((service) => {
      if (!service) return;
      const offeringId = toSlug(service);
      const offeringName = toTitle(service);
      const offeringCategory = categoryId || "general";
      if (!categoryId && !categories.has("general")) {
        categories.set("general", { id: "general", name: "General" });
      }
      offerings.set(offeringId, {
        id: offeringId,
        name: offeringName,
        categoryId: offeringCategory,
      });
      supplierOfferingIds.add(offeringId);
    });

    const productList = Array.isArray(rawSupplier.products) ? rawSupplier.products : [];
    productList.forEach((product) => {
      if (!product) return;
      const productId = toSlug(product);
      const catalogEntry = catalogMap.get(productId);
      const productName = catalogEntry?.name || toTitle(product);

      if (!products.has(productId)) {
        products.set(productId, { id: productId, name: productName, offeringIds: new Set() });
      }

      const aggregate = products.get(productId);
      if (supplierOfferingIds.size > 0) {
        supplierOfferingIds.forEach((offeringId) => aggregate.offeringIds.add(offeringId));
        supplierOfferingIds.forEach((offeringId) => {
          supplierProductEntries.add(`${supplierId}::${productId}::${offeringId}`);
        });
      } else if (categoryId) {
        const fallbackOffering = `${categoryId}-general`;
        if (!offerings.has(fallbackOffering)) {
          offerings.set(fallbackOffering, {
            id: fallbackOffering,
            name: `${toTitle(rawSupplier.category)} General`,
            categoryId,
          });
        }
        aggregate.offeringIds.add(fallbackOffering);
        supplierOfferingIds.add(fallbackOffering);
        supplierProductEntries.add(`${supplierId}::${productId}::${fallbackOffering}`);
      } else {
        supplierProductEntries.add(`${supplierId}::${productId}::any`);
      }
    });

    const address = rawSupplier.address || {};
    const regionFromCounty = resolveRegionByCounty(address.county);
    const regionFromZip = normalizeZip(address.zip || address.postalCode)
      ? zipToRegion.get(normalizeZip(address.zip || address.postalCode))
      : null;
    const regionId = regionFromCounty || regionFromZip || null;

    if (regionId && !regionAggregates.has(regionId)) {
      const regionMeta = REGION_LOOKUP.find((region) => region.id === regionId);
      regionAggregates.set(regionId, {
        id: regionId,
        name: regionMeta?.name || regionId,
        state: "NY",
        counties: new Set(address.county ? [address.county] : []),
        zipCodes: new Set(normalizeZip(address.zip || address.postalCode) ? [normalizeZip(address.zip || address.postalCode)] : []),
      });
    }

    supplierRecords.push({
      id: supplierId,
      slug,
      raw: rawSupplier,
      categoryIds: Array.from(supplierCategoryIds),
      offeringIds: Array.from(supplierOfferingIds),
      productEntries: Array.from(supplierProductEntries),
      address: {
        street: address.street || null,
        city: address.city || null,
        county: address.county || null,
        state: address.state || null,
        zip: address.zip ? normalizeZip(address.zip) : normalizeZip(address.postalCode),
        postalCode: undefined,
        regionId,
      },
    });
  }

  console.log("📦 Writing categories...");
  for (const category of categories.values()) {
    await db.collection("categories").doc(category.id).set(
      {
        name: category.name,
      },
      { merge: true },
    );
  }

  console.log("📦 Writing offerings...");
  for (const offering of offerings.values()) {
    await db.collection("offerings").doc(offering.id).set(
      {
        name: offering.name,
        categoryId: offering.categoryId,
      },
      { merge: true },
    );
  }

  console.log("📦 Writing products...");
  for (const product of products.values()) {
    await db.collection("products").doc(product.id).set(
      {
        name: product.name,
        offeringIds: Array.from(product.offeringIds),
      },
      { merge: true },
    );
  }

  console.log("📦 Writing region metadata...");
  for (const region of regionAggregates.values()) {
    await db.collection("regions").doc(region.id).set(
      {
        name: region.name,
        state: region.state,
        counties: Array.from(region.counties),
        zipCodes: Array.from(region.zipCodes).filter(Boolean),
      },
      { merge: true },
    );
  }

  console.log("📦 Writing suppliers & associations...");
  for (const record of supplierRecords) {
    const raw = record.raw;
    const supplierRef = db.collection("suppliers").doc(record.id);
    const existing = await supplierRef.get();
    const payload = {
      slug: record.slug,
      name: raw.name || "(unknown supplier)",
      email: raw.email || null,
      phone: raw.phone || null,
      website: raw.website || null,
      logo: raw.logo || null,
      description: raw.description || null,
      location: buildFullAddress(raw.address),
      verified: Boolean(raw.verified),
      premium: Boolean(raw.premium),
      address: Object.fromEntries(
        Object.entries(record.address).filter(([, value]) => value !== null && value !== undefined),
      ),
      updatedAt: new Date(),
      createdAt: existing.exists && existing.data()?.createdAt ? existing.data().createdAt : admin.firestore.FieldValue.serverTimestamp(),
    };

    await supplierRef.set(payload, { merge: true });

    const categoryPayloads = record.categoryIds.map((categoryId) => ({
      supplierId: record.id,
      categoryId,
    }));

    const offeringPayloads = record.offeringIds.map((offeringId) => ({
      supplierId: record.id,
      offeringId,
    }));

    const productPayloads = record.productEntries.map((key) => {
      const [supplierId, productId, offeringId] = key.split("::");
      return {
        supplierId,
        productId,
        ...(offeringId && offeringId !== "any" ? { offeringId } : {}),
      };
    });

    await replaceSupplierLinks(db, "supplierCategories", record.id, categoryPayloads, (payload) => `${payload.supplierId}_${payload.categoryId}`);
    await replaceSupplierLinks(db, "supplierOfferings", record.id, offeringPayloads, (payload) => `${payload.supplierId}_${payload.offeringId}`);
    await replaceSupplierLinks(
      db,
      "supplierProducts",
      record.id,
      productPayloads,
      (payload) => `${payload.supplierId}_${payload.productId}_${payload.offeringId || "any"}`,
    );
  }

  console.log("✅ Seeding complete!");
}

seed().catch((error) => {
  console.error("❌ Error seeding Firestore:", error);
  process.exit(1);
});
