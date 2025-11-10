import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const REQUIRED_ENV = "GOOGLE_APPLICATION_CREDENTIALS";

async function ensureFirebase() {
  if (!process.env[REQUIRED_ENV]) {
    throw new Error(
      `${REQUIRED_ENV} is not set. Point it at keys/garden-planner-firebase-admin.json before running this script.`,
    );
  }
  if (!getApps().length) {
    initializeApp({
      credential: applicationDefault(),
      projectId: process.env.GOOGLE_CLOUD_PROJECT || "garden-planner-directory",
    });
  }
  return getFirestore();
}

function hasLegacyAddress(data: Record<string, unknown>): boolean {
  return [
    "street",
    "city",
    "county",
    "state",
    "zip",
    "postalCode",
    "regionId",
    "addressStreet",
    "addressCity",
    "addressCounty",
    "addressState",
    "addressZip",
    "addressRegionId",
  ].some((key) => data[key] !== undefined && data[key] !== null && String(data[key]).length > 0);
}

function normalizeAddress(data: Record<string, unknown>) {
  const nested = typeof data.address === "object" && data.address ? (data.address as Record<string, unknown>) : {};
  const legacy = {
    street: data.street || data.addressStreet,
    city: data.city || data.addressCity,
    county: data.county || data.addressCounty,
    state: data.state || data.addressState,
    zip: data.zip || data.postalCode || data.addressZip,
    regionId: data.regionId || data.addressRegionId,
  };

  const merged: Record<string, unknown> = { ...nested };
  (Object.keys(legacy) as Array<keyof typeof legacy>).forEach((key) => {
    if (merged[key] === undefined && legacy[key]) {
      merged[key] = legacy[key];
    }
  });
  return merged;
}

async function run() {
  const db = await ensureFirebase();
  const snapshot = await db.collection("suppliers").get();
  console.log(`📦 Found ${snapshot.size} supplier docs`);

  let updated = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data() ?? {};
    const needsMigration = hasLegacyAddress(data) || typeof data.address !== "object";
    if (!needsMigration) {
      continue;
    }

    const address = normalizeAddress(data);
    const updates: Record<string, unknown> = { address };

    [
      "street",
      "city",
      "county",
      "state",
      "zip",
      "postalCode",
      "regionId",
      "addressStreet",
      "addressCity",
      "addressCounty",
      "addressState",
      "addressZip",
      "addressRegionId",
    ].forEach((key) => {
      if (data[key] !== undefined) {
        updates[key] = FieldValue.delete();
      }
    });

    await doc.ref.update(updates);
    updated += 1;
  }

  console.log(`✅ Updated ${updated} suppliers. Nested address map is now consistent.`);
}

run().catch((err) => {
  console.error("❌ Migration failed", err);
  process.exit(1);
});
