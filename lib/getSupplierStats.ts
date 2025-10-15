import { db } from "./firebaseAdmin";

export async function getSupplierStats() {
  console.log("📊 Running Firestore stats fetch...");
  if (!db) {
    throw new Error("❌ Firestore Admin client not initialized — db is undefined");
  }
  const snapshot = await db.collection("suppliers").get();

  const suppliers = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  const verifiedCount = suppliers.filter((s) => s.verified).length;
  const premiumCount = suppliers.filter((s) => s.premium).length;

  return {
    totalSuppliers: suppliers.length,
    verifiedCount,
    premiumCount,
    suppliers,
  };
}