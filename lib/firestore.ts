// lib/firestore.ts
import { Supplier } from "./types";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import localSuppliers from "../data/suppliers.json";

// Named export (NOT default) to avoid “getSuppliers is not a function”.
export async function getSuppliers(): Promise<Supplier[]> {
  try {
    const suppliersCol = collection(db, "suppliers");
    const supplierSnapshot = await getDocs(suppliersCol);
    if (supplierSnapshot.empty) {
      return localSuppliers;
    }
    const suppliers: Supplier[] = supplierSnapshot.docs.map(doc => {
      const data: any = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : null,
      } as Supplier;
    });
    return suppliers;
  } catch (error) {
    return localSuppliers;
  }
}

export async function getSupplierBySlug(slug: string): Promise<Supplier | null> {
  try {
    // Attempt to load from Firestore
    const suppliersCol = collection(db, "suppliers");
    const snapshot = await getDocs(suppliersCol);
    const suppliers = snapshot.docs.map(doc => doc.data() as Supplier);
    const supplier = suppliers.find(s => s.slug === slug);
    if (supplier) {
      console.log("✅ Found supplier in Firestore:", supplier.slug);
      return supplier;
    } else {
      console.warn("⚠️ Supplier not found in Firestore, falling back to local data.");
    }
  } catch (error) {
    console.warn("⚠️ Firestore unavailable, using local fallback:", error);
  }

  // Always try local fallback if Firestore fails or supplier not found
  try {
    const supplier = localSuppliers.find(s => s.slug === slug);
    if (supplier) {
      console.log("✅ Loaded supplier from local JSON:", supplier.slug);
      return supplier;
    }
    console.warn("❌ Supplier not found in local JSON either:", slug);
    return null;
  } catch (localError) {
    console.error("🔥 Local fallback failed:", localError);
    return null;
  }
}