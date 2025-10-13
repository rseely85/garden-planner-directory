import type { Supplier, Category } from "./types";

// ✅ SERVER: use firebase-admin only when not running in browser
let serverDb: FirebaseFirestore.Firestore | null = null;
if (typeof window === "undefined") {
  const { adminDb } = require("./firebaseAdmin");
  serverDb = adminDb;
}

// ✅ CLIENT: use Firebase Web SDK
import { db as clientDb } from "./firebaseClient";
import { collection, getDocs } from "firebase/firestore";

/**
 * Fetch all suppliers from Firestore.
 * Automatically detects whether running server-side or client-side.
 */
export async function getSuppliers(): Promise<Supplier[]> {
  try {
    if (typeof window === "undefined" && serverDb) {
      // --- SERVER-SIDE FETCH ---
      const snapshot = await serverDb.collection("suppliers").get();
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : null,
        };
      }) as Supplier[];
    } else {
      // --- CLIENT-SIDE FETCH ---
      const snapshot = await getDocs(collection(clientDb, "suppliers"));
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : null,
        };
      }) as Supplier[];
    }
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