import { adminDb } from "@/lib/firebaseAdmin";

export type RawSupplier = {
  id: string;
  [key: string]: any;
};

function serializeSupplier(doc: FirebaseFirestore.QueryDocumentSnapshot): RawSupplier {
  const data = doc.data();
  const serializeTimestamp = (value: any) =>
    value?.toDate ? value.toDate().toISOString() : value ?? null;

  return {
    id: doc.id,
    ...data,
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

export async function getAllSuppliersAdmin(): Promise<RawSupplier[]> {
  const snapshot = await adminDb.collection("suppliers").get();
  const suppliers = snapshot.docs.map((doc) => serializeSupplier(doc));
  console.log("✅ Restored supplier fetch working:", suppliers.length);
  if (!suppliers.length) {
    console.warn("⚠️ No suppliers loaded — check Firestore data or authentication.");
  }
  return suppliers;
}
