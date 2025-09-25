// lib/firestore.ts
// Firestore helper functions for Garden Planner Directory

import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";

// Get suppliers by optional filters
export async function getSuppliersByFilters(city?: string, category?: string) {
  let q = collection(db, "suppliers");

  // Apply filters dynamically
  if (city && category) {
    q = query(collection(db, "suppliers"), where("city", "==", city), where("services", "array-contains", category));
  } else if (city) {
    q = query(collection(db, "suppliers"), where("city", "==", city));
  } else if (category) {
    q = query(collection(db, "suppliers"), where("services", "array-contains", category));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// Get single supplier by slug (id)
export async function getSupplierBySlug(slug: string) {
  const ref = doc(db, "suppliers", slug);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

// Get products catalog
export async function getProductsCatalog() {
  const snapshot = await getDocs(collection(db, "productsCatalog"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// Create review (requires auth)
export async function createReview(supplierId: string, review: any) {
  const ref = doc(collection(db, "suppliers", supplierId, "reviews"));
  await setDoc(ref, review);
  return { id: ref.id, ...review };
}
