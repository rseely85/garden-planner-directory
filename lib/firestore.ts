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