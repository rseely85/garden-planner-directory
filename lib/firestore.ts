import type { Supplier, Category } from "./types";
import { getAllSuppliersAdmin } from "@/lib/data/suppliers";
/**
 * Fetch all suppliers from Firestore.
 * Automatically detects whether running server-side or client-side.
 */
export async function getSuppliers(): Promise<Supplier[]> {
  try {
    if (typeof window === "undefined") {
      const suppliers = await getAllSuppliersAdmin();
      return suppliers as Supplier[];
    }

    const response = await fetch("/api/suppliers");
    const json = await response.json();
    const suppliers = (json?.suppliers ?? []) as Supplier[];
    if (!suppliers.length) {
      console.warn("⚠️ No suppliers loaded — check Firestore data or authentication.");
    }
    console.log("🧾 Suppliers loaded:", suppliers);
    return suppliers;
  } catch (error) {
    console.error("❌ Firestore error fetching suppliers:", error);
    return [];
  }
}

/**
 * Filter suppliers by city and category.
 */
export async function getSuppliersByFilters(city?: string, category?: Category) {
  const suppliers = await getSuppliers();
  return suppliers.filter(supplier => {
    const matchesCity = city ? supplier.address?.city?.toLowerCase() === city.toLowerCase() : true;
    const matchesCategory = category ? supplier.category === category : true;
    return matchesCity && matchesCategory;
  });
}

/**
 * Fetch a single supplier by slug.
 */
export async function getSupplierBySlug(slug: string): Promise<Supplier | null> {
  const suppliers = await getSuppliers();
  return suppliers.find(s => s.slug === slug) || null;
}
