const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Initialize Firestore with ADC + forced projectId
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "garden-planner-directory", // your Firebase project ID
});

const db = admin.firestore();

// Helper to load JSON from /data
function loadJSON(fileName) {
  const filePath = path.resolve(process.cwd(), "data", fileName);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

async function seed() {
  try {
    // Load from JSON files
    const suppliers = loadJSON("suppliers.json");
    const products = loadJSON("productsCatalog.json");

    // Helper to create a slug from supplier name
    function makeSlug(name) {
      return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    }

    // Seed suppliers
    for (const supplier of suppliers) {
      const slug = supplier.slug || makeSlug(supplier.name);
      const ref = db.collection("suppliers").doc(slug);
      const doc = await ref.get();

      if (doc.exists) {
        await ref.set({ ...supplier, slug, updatedAt: new Date() }, { merge: true });
        console.log(`🔄 Updated supplier: ${slug}`);
      } else {
        await ref.set({ ...supplier, slug, createdAt: new Date(), updatedAt: new Date() });
        console.log(`✨ Created new supplier: ${slug}`);
      }
    }

    // Seed products
    for (const product of products) {
      const ref = db.collection("productsCatalog").doc(product.id);
      const doc = await ref.get();

      if (doc.exists) {
        await ref.set({ ...product, updatedAt: new Date() }, { merge: true });
        console.log(`🔄 Updated product: ${product.id}`);
      } else {
        await ref.set({ ...product, createdAt: new Date(), updatedAt: new Date() });
        console.log(`✨ Created new product: ${product.id}`);
      }
    }

    console.log("✅ Seeding complete!");
  } catch (error) {
    console.error("❌ Error seeding Firestore:", error);
  }
}

seed();