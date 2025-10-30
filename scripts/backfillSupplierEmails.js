// scripts/backfillSupplierEmails.js
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

(async () => {
  console.log("🌱 Starting supplier email backfill...");

  const snapshot = await db.collection("suppliers").get();
  let count = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.email) {
      const email = `${data.slug || doc.id}@example.com`;
      await db.collection("suppliers").doc(doc.id).update({ email });
      console.log(`✅ Updated ${data.name || doc.id} → ${email}`);
      count++;
    }
  }

  console.log(`🎯 Email backfill complete. Updated ${count} suppliers.`);
})();