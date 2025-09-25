const admin = require("firebase-admin");
const fs = require("fs");

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});
const db = admin.firestore();

async function seed() {
  const products = JSON.parse(fs.readFileSync("data/productsCatalog.json"));
  const suppliers = JSON.parse(fs.readFileSync("data/suppliersSeed.json"));

  for (const p of products) {
    await db.collection("productsCatalog").doc(p.id).set(p);
  }
  for (const s of suppliers) {
    await db.collection("suppliers").doc(s.id).set(s);
  }
  console.log("✅ Seed complete");
}
seed();
