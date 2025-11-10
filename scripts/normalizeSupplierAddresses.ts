import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const REMOVAL_KEYS = [
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
];

const normalizeAddressKeys = (address: Record<string, unknown>) => {
  return Object.entries(address).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (typeof key === "string" && key.includes(".")) {
      const segments = key.split(".");
      acc[segments[segments.length - 1]] = value;
    } else {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const buildNormalizedAddress = (data: Record<string, any>) => {
  const rawAddress =
    typeof data.address === "object" && data.address !== null ? (data.address as Record<string, unknown>) : {};
  const source = normalizeAddressKeys(rawAddress);
  const readValue = (obj: Record<string, unknown>, prop?: string) =>
    prop && Object.prototype.hasOwnProperty.call(obj, prop) ? obj[prop] : undefined;

  const pick = (key: string, backup?: string) => {
    const candidate =
      readValue(source, key) ??
      (backup ? readValue(source, backup) : undefined) ??
      readValue(data, key) ??
      (backup ? readValue(data, backup) : undefined) ??
      readValue(data, `address.${key}`) ??
      (backup ? readValue(data, `address.${backup}`) : undefined);
    if (candidate === undefined || candidate === null) {
      return undefined;
    }
    const value = String(candidate).trim();
    return value.length ? value : undefined;
  };

  return {
    street: pick("street", "addressStreet"),
    city: pick("city", "addressCity"),
    county: pick("county", "addressCounty"),
    state: pick("state", "addressState"),
    zip: pick("zip") ?? pick("postalCode", "addressZip"),
    regionId: pick("regionId", "addressRegionId") ?? (data.regionId ? String(data.regionId).trim() : undefined),
  };
};

async function run() {
  if (!getApps().length) {
    initializeApp({
      credential: applicationDefault(),
      projectId: process.env.GOOGLE_CLOUD_PROJECT || "garden-planner-directory",
    });
  }
  const db = getFirestore();
  const snapshot = await db.collection("suppliers").get();
  console.log(`📦 Found ${snapshot.size} suppliers`);

  let updated = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data() ?? {};
    const normalized = buildNormalizedAddress(data);
    const address = Object.fromEntries(
      Object.entries(normalized).filter(([, value]) => value !== undefined && value !== null && value !== ""),
    );
    const payload: Record<string, unknown> = {
      address,
    };

    REMOVAL_KEYS.forEach((key) => {
      if (data[key] !== undefined) {
        payload[key] = FieldValue.delete();
      }
    });

    await doc.ref.set(payload, { merge: true });
    updated += 1;
  }

  console.log(`✅ Normalized ${updated} supplier records.`);
}

run().catch((err) => {
  console.error("❌ normalizeSupplierAddresses failed", err);
  process.exit(1);
});
