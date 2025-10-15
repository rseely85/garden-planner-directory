import { db } from "./firebaseAdmin";

export async function getSupplierStats() {
  console.log("📊 Running Firestore stats fetch...");
  if (!db) {
    throw new Error("❌ Firestore Admin client not initialized — db is undefined");
  }
  const snapshot = await db.collection("suppliers").get();

  const suppliers = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      lastUpdated: data.lastUpdated || null,
      location: data.location || null,
      missingFields: [
        !data.name && "name",
        !data.email && "email",
        !data.verified && "verified",
        !data.premium && "premium",
        !data.location && "location",
        !data.lastUpdated && "lastUpdated",
      ].filter(Boolean),
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