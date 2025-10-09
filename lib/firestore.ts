import admin from "firebase-admin";
import type { Category, Supplier } from "./types";

// Initialize Firestore using ADC credentials
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: "garden-planner-directory",
  });
}
const db = admin.firestore();

export async function getSuppliers(): Promise<Supplier[]> {
  try {
    const snapshot = await db.collection("suppliers").get();
    if (snapshot.empty) {
      console.warn("⚠️ No suppliers found in Firestore.");
      return [];
    }
    return snapshot.docs.map(doc => {
      const data = doc.data();
      const jsonSafeData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => {
          if (value instanceof admin.firestore.Timestamp) {
            return [key, value.toDate().toISOString()];
          }
          return [key, value];
        })
      );
      return {
        id: doc.id,
        ...jsonSafeData,
      };
    }) as Supplier[];
  } catch (error) {
    console.error("❌ Firestore error fetching suppliers:", error);
    return [];
  }
}


export async function getSuppliersByFilters(city?: string, category?: Category) {
  const suppliers = await getSuppliers();
  return suppliers.filter(supplier => {
    const matchesCity = city ? supplier.address?.city?.toLowerCase() === city.toLowerCase() : true;
    const matchesCategory = category ? supplier.category === category : true;
    return matchesCity && matchesCategory;
  });
}

export async function getSupplierBySlug(slug: string): Promise<Supplier | null> {
  const suppliers = await getSuppliers();
  const supplier = suppliers.find(s => s.slug === slug);
  return supplier || null;
}