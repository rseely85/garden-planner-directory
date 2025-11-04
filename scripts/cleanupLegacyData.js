const admin = require("firebase-admin");

async function initAdmin() {
  if (!admin.apps.length) {
    console.log("🌱 Initializing Firebase Admin (applicationDefault)");
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.GOOGLE_CLOUD_PROJECT || "garden-planner-directory",
    });
  }
  return admin.firestore();
}

async function removeProductsCatalog(db) {
  const snapshot = await db.collection("productsCatalog").get();
  if (snapshot.empty) {
    console.log("✅ No legacy productsCatalog documents found.");
    return 0;
  }
  let deleted = 0;
  for (const doc of snapshot.docs) {
    await doc.ref.delete();
    deleted++;
  }
  console.log(`🧹 Removed ${deleted} document(s) from productsCatalog.`);
  return deleted;
}

async function loadSupplierProductMap(db) {
  const map = new Map();
  const snapshot = await db.collection("supplierProducts").get();
  snapshot.forEach((doc) => {
    const data = doc.data() || {};
    if (!data.productId) return;
    const key = data.productId;
    if (!map.has(key)) {
      map.set(key, new Set());
    }
    if (data.offeringId) {
      map.get(key).add(data.offeringId);
    }
  });
  return map;
}

async function normalizeProducts(db) {
  const supplierProductMap = await loadSupplierProductMap(db);
  const snapshot = await db.collection("products").get();
  if (snapshot.empty) {
    console.log("✅ No products found.");
    return { normalized: 0, removed: 0 };
  }

  let normalized = 0;
  let removed = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    if (Array.isArray(data.offeringIds) && data.offeringIds.length > 0 && !data.category && !data.price && !data.supplier && !data.id) {
      continue;
    }

    const offerings = supplierProductMap.get(doc.id);
    if (offerings && offerings.size > 0) {
      const payload = {
        name: data.name || doc.id,
        offeringIds: Array.from(offerings),
      };
      await doc.ref.set(payload, { merge: false });
      normalized++;
      console.log(`🔄 Normalized product ${doc.id}`);
    } else {
      await doc.ref.delete();
      removed++;
      console.log(`🗑️ Removed orphan product ${doc.id}`);
    }
  }

  return { normalized, removed };
}

async function stripLegacySupplierFields(db) {
  const snapshot = await db.collection("suppliers").get();
  if (snapshot.empty) {
    console.log("✅ No suppliers found.");
    return 0;
  }

  let cleaned = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    if (!("category" in data) && !("products" in data) && !("services" in data)) {
      continue;
    }
    await doc.ref.update({
      category: admin.firestore.FieldValue.delete(),
      products: admin.firestore.FieldValue.delete(),
      services: admin.firestore.FieldValue.delete(),
    });
    cleaned++;
    console.log(`♻️ Removed legacy fields from supplier ${doc.id}`);
  }
  return cleaned;
}

async function main() {
  const db = await initAdmin();
  console.log("🔧 Cleaning up legacy Firestore data...");

  await removeProductsCatalog(db);
  const productResult = await normalizeProducts(db);
  const suppliersCleaned = await stripLegacySupplierFields(db);

  console.log("\n✅ Cleanup summary:");
  console.log(`  Products normalized: ${productResult.normalized}`);
  console.log(`  Orphan products removed: ${productResult.removed}`);
  console.log(`  Suppliers cleaned: ${suppliersCleaned}`);
}

if (require.main === module) {
  main()
    .then(() => {
      console.log("🎉 Legacy cleanup finished.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("🔥 Cleanup failed:", error);
      process.exit(1);
    });
}

