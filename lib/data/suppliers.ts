import { adminDb } from "@/lib/firebaseAdmin";
import type {
  SupplierRecord,
  SupplierView,
  SupplierCategoryLink,
  SupplierOfferingLink,
  SupplierProductLink,
} from "@/lib/types";
import { ensureSupplierAddress } from "@/lib/utils/ensureSupplierAddress";

function extractIdValue(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (value && typeof value === "object") {
    const candidate =
      typeof (value as { id?: unknown }).id === "string"
        ? (value as { id: string }).id
        : typeof (value as { value?: unknown }).value === "string"
        ? (value as { value: string }).value
        : null;
    if (candidate) {
      const trimmed = candidate.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
  }
  return null;
}

function sanitizeIdList(payload: unknown): string[] {
  if (payload === undefined || payload === null) {
    return [];
  }
  const list = Array.isArray(payload) ? payload : [payload];
  const seen = new Set<string>();
  list.forEach((entry) => {
    const id = extractIdValue(entry);
    if (id) {
      seen.add(id);
    }
  });
  return Array.from(seen);
}

export async function getSupplierSummaries(): Promise<Array<{ id: string; name: string }>> {
  const snapshot = await adminDb.collection("suppliers").get();
  return snapshot.docs.map((doc) => {
    const data = doc.data() ?? {};
    const rawName = typeof data.name === "string" && data.name.trim().length > 0 ? data.name : doc.id;
    return {
      id: doc.id,
      name: rawName,
    };
  });
}

function serializeTimestamp(value: any): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value.toDate === "function") {
    try {
      return value.toDate().toISOString();
    } catch (err) {
      return null;
    }
  }
  return null;
}

function buildSupplierRecord(doc: FirebaseFirestore.QueryDocumentSnapshot): SupplierRecord {
  const normalizedData = ensureSupplierAddress<Record<string, unknown>>({
    ...(doc.data() ?? {}),
  });
  const address = normalizedData.address ?? undefined;
  console.log("DEBUG address check", doc.id, address);

  const toStringOrUndefined = (value: unknown): string | undefined => {
    if (value === undefined || value === null) {
      return undefined;
    }
    return String(value);
  };

  const toStringOrNull = (value: unknown): string | null => {
    if (value === undefined || value === null) {
      return null;
    }
    return String(value);
  };

  return {
    id: doc.id,
    slug: toStringOrUndefined(normalizedData.slug) || doc.id,
    name: toStringOrUndefined(normalizedData.name) || "(missing name)",
    email: toStringOrUndefined(normalizedData.email),
    phone: toStringOrUndefined(normalizedData.phone),
    website: toStringOrUndefined(normalizedData.website),
    logo: toStringOrUndefined(normalizedData.logo),
    description: toStringOrUndefined(normalizedData.description),
    location: toStringOrUndefined(normalizedData.location),
    verified: typeof normalizedData.verified === "boolean" ? normalizedData.verified : undefined,
    premium: typeof normalizedData.premium === "boolean" ? normalizedData.premium : undefined,
    address,
    createdAt: serializeTimestamp(normalizedData.createdAt),
    updatedAt: serializeTimestamp(normalizedData.updatedAt),
    lastUpdated: toStringOrUndefined(normalizedData.lastUpdated) || serializeTimestamp(normalizedData.updatedAt),
  };
}

type AssociationMap = Record<string, Set<string>>;

function mapAssociations<T extends { supplierId: string; [key: string]: any }>(
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
  key: keyof T,
): AssociationMap {
  return docs.reduce((acc, doc) => {
    const data = doc.data() as T;
    const supplierId = data.supplierId;
    const valueKey = data[key];
    if (!supplierId || !valueKey) {
      return acc;
    }
    if (!acc[supplierId]) {
      acc[supplierId] = new Set<string>();
    }
    acc[supplierId].add(String(valueKey));
    return acc;
  }, {} as AssociationMap);
}

export async function getAllSuppliersAdmin(): Promise<SupplierView[]> {
  const db = adminDb;
  const suppliersSnap = await db.collection("suppliers").get();

  const [categoryLinksSnap, offeringLinksSnap, productLinksSnap] = await Promise.all([
    db.collection("supplierCategories").get().catch(() => null),
    db.collection("supplierOfferings").get().catch(() => null),
    db.collection("supplierProducts").get().catch(() => null),
  ]);

  const categoryMap = categoryLinksSnap
    ? mapAssociations<SupplierCategoryLink>(categoryLinksSnap.docs, "categoryId")
    : {};
  const offeringMap = offeringLinksSnap
    ? mapAssociations<SupplierOfferingLink>(offeringLinksSnap.docs, "offeringId")
    : {};
  const productMap = productLinksSnap
    ? mapAssociations<SupplierProductLink>(productLinksSnap.docs, "productId")
    : {};

  const suppliers: SupplierView[] = suppliersSnap.docs.map((doc) => {
    const base = buildSupplierRecord(doc);
    const legacyData = doc.data() ?? {};

    const categoriesSource = categoryMap[doc.id]?.size
      ? Array.from(categoryMap[doc.id])
      : legacyData.categories ?? (legacyData.category ? [legacyData.category] : []);
    const offeringsSource = offeringMap[doc.id]?.size
      ? Array.from(offeringMap[doc.id])
      : legacyData.offerings ?? legacyData.services;
    const productsSource = productMap[doc.id]?.size
      ? Array.from(productMap[doc.id])
      : legacyData.products;

    const categories = sanitizeIdList(categoriesSource);
    const offerings = sanitizeIdList(offeringsSource);
    const products = sanitizeIdList(productsSource);

    const primaryCategory = categories[0] ?? null;
    return {
      ...base,
      categories,
      offerings,
      products,
      category: primaryCategory,
      services: offerings,
    };
  });

  console.log("✅ Loaded suppliers with associations:", suppliers.length);
  if (!suppliers.length) {
    console.warn("⚠️ No suppliers loaded — check Firestore data or authentication.");
  }

  return suppliers;
}
