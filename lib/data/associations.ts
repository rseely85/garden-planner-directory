import { adminDb } from "@/lib/firebaseAdmin";
import type {
  SupplierCategoryLink,
  SupplierOfferingLink,
  SupplierProductLink,
} from "@/lib/types";

async function ensureDocExists(collection: string, id: string) {
  if (!id) {
    throw new Error(`Missing identifier for ${collection}`);
  }
  const doc = await adminDb.collection(collection).doc(id).get();
  if (!doc.exists) {
    throw new Error(`${collection} document '${id}' does not exist`);
  }
}

async function dedupe<T extends { supplierId: string; [key: string]: any }>(
  collection: string,
  docId: string,
  payload: T,
) {
  await adminDb.collection(collection).doc(docId).set(payload, { merge: true });
  return payload;
}

function buildDocId(parts: Array<string | undefined | null>) {
  return parts.filter(Boolean).join("_");
}

export async function listSupplierCategories(supplierId?: string): Promise<SupplierCategoryLink[]> {
  let query = adminDb.collection("supplierCategories") as FirebaseFirestore.Query;
  if (supplierId) {
    query = query.where("supplierId", "==", supplierId);
  }
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => doc.data() as SupplierCategoryLink);
}

export async function upsertSupplierCategory(link: SupplierCategoryLink) {
  await ensureDocExists("suppliers", link.supplierId);
  await ensureDocExists("categories", link.categoryId);
  const docId = buildDocId([link.supplierId, link.categoryId]);
  return dedupe("supplierCategories", docId, link);
}

export async function deleteSupplierCategory(link: SupplierCategoryLink) {
  const docId = buildDocId([link.supplierId, link.categoryId]);
  await adminDb.collection("supplierCategories").doc(docId).delete();
}

export async function listSupplierOfferings(supplierId?: string): Promise<SupplierOfferingLink[]> {
  let query = adminDb.collection("supplierOfferings") as FirebaseFirestore.Query;
  if (supplierId) {
    query = query.where("supplierId", "==", supplierId);
  }
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => doc.data() as SupplierOfferingLink);
}

export async function upsertSupplierOffering(link: SupplierOfferingLink) {
  await ensureDocExists("suppliers", link.supplierId);
  await ensureDocExists("offerings", link.offeringId);
  const docId = buildDocId([link.supplierId, link.offeringId]);
  return dedupe("supplierOfferings", docId, link);
}

export async function deleteSupplierOffering(link: SupplierOfferingLink) {
  const docId = buildDocId([link.supplierId, link.offeringId]);
  await adminDb.collection("supplierOfferings").doc(docId).delete();
}

export async function listSupplierProducts(supplierId?: string): Promise<SupplierProductLink[]> {
  let query = adminDb.collection("supplierProducts") as FirebaseFirestore.Query;
  if (supplierId) {
    query = query.where("supplierId", "==", supplierId);
  }
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => doc.data() as SupplierProductLink);
}

export async function upsertSupplierProduct(link: SupplierProductLink) {
  await ensureDocExists("suppliers", link.supplierId);
  await ensureDocExists("products", link.productId);
  if (link.offeringId) {
    await ensureDocExists("offerings", link.offeringId);
  }
  const docId = buildDocId([link.supplierId, link.productId, link.offeringId || "any"]);
  return dedupe("supplierProducts", docId, link);
}

export async function deleteSupplierProduct(link: SupplierProductLink) {
  const docId = buildDocId([link.supplierId, link.productId, link.offeringId || "any"]);
  await adminDb.collection("supplierProducts").doc(docId).delete();
}

