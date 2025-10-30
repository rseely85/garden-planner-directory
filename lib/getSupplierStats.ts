import { db } from "./firebaseAdmin";

type SupplierDoc = {
  name?: string;
  email?: string;
  verified?: boolean;
  premium?: boolean;
  location?: string;
  region?: string;
  county?: string;
  lastUpdated?: string;
  updatedAt?: FirebaseFirestore.Timestamp | string;
  createdAt?: FirebaseFirestore.Timestamp | string;
  slug?: string;
  [key: string]: any;
};

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

export async function getSupplierStats() {
  console.log("📊 Running Firestore stats fetch...");
  if (!db) {
    throw new Error("❌ Firestore Admin client not initialized — db is undefined");
  }
  const snapshot = await db.collection("suppliers").get();

  const suppliers = snapshot.docs.map((doc) => {
    const data = doc.data() as SupplierDoc;
    const missingFields = [
      !data.name && "name",
      !data.email && "email",
      !data.verified && "verified",
      !data.premium && "premium",
      !data.location && "location",
      (!data.lastUpdated && !data.updatedAt && !data.createdAt) && "lastUpdated",
    ].filter(Boolean) as string[];

    const region = data.region || data.county || data.location || null;

    return {
      id: doc.id,
      slug: data.slug || doc.id,
      name: data.name || "(missing name)",
      category: data.category || null,
      email: data.email || null,
      verified: Boolean(data.verified),
      premium: Boolean(data.premium),
      location: data.location || null,
      region,
      missingFields,
      createdAt: toIsoString(data.createdAt),
      updatedAt: toIsoString(data.updatedAt),
      lastUpdated: data.lastUpdated || toIsoString(data.updatedAt),
      raw: data,
    };
  });

  const verifiedCount = suppliers.filter((s) => s.verified).length;
  const premiumCount = suppliers.filter((s) => s.premium).length;

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
