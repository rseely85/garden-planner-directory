import * as admin from "firebase-admin";

async function verifyRegions() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }

  const db = admin.firestore();
  const zipsRef = db.collection("regions").doc("NY").collection("zips");

  console.log("🔍 Counting NY ZIP docs...");
  const snapshot = await zipsRef.get();
  console.log(`✅ Total ZIP records: ${snapshot.size}`);

  // Check a few specific ZIPs
  const sampleZips = ["10001", "14546", "14850"];
  for (const zip of sampleZips) {
    const doc = await zipsRef.doc(zip).get();
    if (doc.exists) {
      console.log(`📬 ${zip}:`, doc.data());
    } else {
      console.warn(`⚠️ ZIP ${zip} not found.`);
    }
  }

  console.log("✅ Region verification complete!");
}

verifyRegions().catch(console.error);