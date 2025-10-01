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
    const suppliers: Supplier[] = supplierSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier));
    return suppliers;
  } catch (error) {
    return localSuppliers;
  }
}