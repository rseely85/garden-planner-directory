import { adminDb } from "@/lib/firebaseAdmin";
import type {
  SupplierRecord,
  SupplierView,
  SupplierCategoryLink,
  SupplierOfferingLink,
  SupplierProductLink,
} from "@/lib/types";

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
  const data = doc.data() ?? {};
  const address =
    typeof data.address === "object" && data.address
      ? {
          street: data.address.street ?? undefined,
          city: data.address.city ?? undefined,
          county: data.address.county ?? undefined,
          state: data.address.state ?? undefined,
          zip: data.address.zip ? String(data.address.zip) : undefined,
          regionId: data.address.regionId ?? data.regionId ?? null,
        }
      : undefined;

  return {
    id: doc.id,
    slug: data.slug || doc.id,
    name: data.name || "(missing name)",
    email: data.email || undefined,
    phone: data.phone || undefined,
    website: data.website || undefined,
    logo: data.logo || undefined,
    description: data.description || undefined,
    location: data.location || undefined,
    verified: typeof data.verified === "boolean" ? data.verified : undefined,
    premium: typeof data.premium === "boolean" ? data.premium : undefined,
    address,
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
    lastUpdated: data.lastUpdated || serializeTimestamp(data.updatedAt),
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

    const categories =
      categoryMap[doc.id]?.size
        ? Array.from(categoryMap[doc.id])
        : (legacyData.category ? [legacyData.category] : legacyData.categories) ?? [];

    const offerings =
      offeringMap[doc.id]?.size
        ? Array.from(offeringMap[doc.id])
        : (legacyData.offerings as string[]) ?? (legacyData.services as string[]) ?? [];

    const products =
      productMap[doc.id]?.size
        ? Array.from(productMap[doc.id])
        : (legacyData.products as string[]) ?? [];

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
