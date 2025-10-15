import { db } from "@/lib/firebaseAdmin";

export const getAdminStats = async () => {
  const suppliersSnapshot = await db.collection("suppliers").get();

  const totalSuppliers = suppliersSnapshot.size;
  let verifiedCount = 0;
  let premiumCount = 0;
  const categories = new Set<string>();
  const services = new Set<string>();
  const regions = new Set<string>();

  suppliersSnapshot.forEach((doc) => {
    const data = doc.data();

    if (data.verified) verifiedCount++;
    if (data.premium) premiumCount++;

    if (data.category) categories.add(data.category);
    if (data.services && Array.isArray(data.services)) {
      data.services.forEach((s: string) => services.add(s));
    }
    if (data.county) regions.add(data.county);
  });

  return {
    totalSuppliers,
    verifiedCount,
    premiumCount,
    categories: Array.from(categories),
    services: Array.from(services),
    regions: Array.from(regions),
    lastUpdated: new Date().toISOString(),
  };
};