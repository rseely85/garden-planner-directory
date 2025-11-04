const admin = require("firebase-admin");

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

function toZip(value) {
  if (!value) return undefined;
  const cleaned = value.toString().trim();
  if (!cleaned) return undefined;
  return cleaned.padStart(5, "0");
}

function resolveRegionByCounty(county) {
  if (!county || typeof county !== "string") return null;
  const normalized = county.trim().toLowerCase();
  const match = REGION_LOOKUP.find((region) =>
    region.counties.some((entry) => entry.toLowerCase() === normalized),
  );
  return match ? match.id : null;
}

async function buildZipRegionIndex(db) {
  const zipToRegion = new Map();
  const regionsSnap = await db.collection("regions").get();
  regionsSnap.forEach((doc) => {
    const data = doc.data() || {};
    const regionId = doc.id;
    const zipCodes = Array.isArray(data.zipCodes) ? data.zipCodes : [];
    zipCodes.forEach((zip) => {
      const normalized = toZip(zip);
      if (normalized) {
        zipToRegion.set(normalized, regionId);
      }
    });
  });
  return zipToRegion;
}

async function main() {
  if (!admin.apps.length) {
    console.log("🌱 Initializing Firebase Admin (applicationDefault)");
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.GOOGLE_CLOUD_PROJECT || "garden-planner-directory",
    });
  }

  const db = admin.firestore();
  const zipToRegion = await buildZipRegionIndex(db);

  console.log("🔄 Backfilling supplier region assignments...");
  const snapshot = await db.collection("suppliers").get();
  if (snapshot.empty) {
    console.warn("⚠️ No supplier documents found.");
    return;
  }

  let updated = 0;
  let skipped = 0;
  const unknown = [];

  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    const address = data.address || {};
    const countyRegion = resolveRegionByCounty(address.county);
    const zipRegion = zipToRegion.get(toZip(address.zip));
    const regionId = countyRegion || zipRegion || null;
    const currentRegion = address.regionId || null;

    if (!regionId) {
      skipped++;
      unknown.push({ id: doc.id, name: data.name || doc.id });
      continue;
    }

    if (currentRegion === regionId) {
      skipped++;
      continue;
    }

    await doc.ref.update({
      "address.regionId": regionId,
    });
    console.log(`✅ ${doc.id}: regionId → ${regionId}`);
    updated++;
  }

  console.log(`\n📊 Region backfill complete. Updated ${updated}, skipped ${skipped}.`);
  if (unknown.length) {
    console.log("⚠️ Suppliers without a resolved region:");
    unknown.forEach((entry) => console.log(`   - ${entry.id}: ${entry.name}`));
  }
}

if (require.main === module) {
  main()
    .then(() => {
      console.log("🎉 Region backfill finished.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("🔥 Region backfill failed:", error);
      process.exit(1);
    });
}

