// lib/getSupplierStats.ts
import { getSuppliers } from "./firestore";

export async function getSupplierStats() {
  try {
    const suppliers = await getSuppliers();
    const byCategory: Record<string, number> = {};
    let verified = 0;
    let premium = 0;
    let earliest = new Date();
    let latest = new Date(0);

    suppliers.forEach((s) => {
      // Category count
      if (s.category) byCategory[s.category] = (byCategory[s.category] || 0) + 1;
      // Verified / Premium
      if (s.verified) verified++;
      if (s.premium) premium++;
      // Date range
      if (s.updatedAt) {
        const d = new Date(s.updatedAt);
        if (d < earliest) earliest = d;
        if (d > latest) latest = d;
      }
    });

    // Convert date fields to ISO strings for JSON serialization
    const suppliersWithISODate = suppliers.map((s) => {
      const copy = { ...s };
      if (copy.createdAt) copy.createdAt = new Date(copy.createdAt).toISOString();
      if (copy.updatedAt) copy.updatedAt = new Date(copy.updatedAt).toISOString();
      return copy;
    });

    return {
      total: suppliers.length,
      byCategory,
      verified,
      premium,
      updatedRange: {
        earliest: earliest.toISOString().split("T")[0],
        latest: latest.toISOString().split("T")[0],
      },
      suppliers: suppliersWithISODate,
    };
  } catch (err) {
    console.error("❌ Error generating supplier stats:", err);
    return null;
  }
}