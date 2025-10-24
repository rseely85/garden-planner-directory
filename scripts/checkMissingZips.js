/**
 * checkMissingZips.js
 * ------------------------------------------------------------
 * Verifies which supplier documents are missing ZIP or postal codes.
 * Run manually anytime to confirm backend data matches dashboard stats.
 * ------------------------------------------------------------
 */

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin using ADC (same as your main app)
console.log("🚀 Initializing Firebase Admin...");
initializeApp({
  credential: applicationDefault(),
});
const db = getFirestore();

async function checkMissingZips() {
  console.log("📦 Scanning suppliers collection for missing ZIPs...");

  const snapshot = await db.collection("suppliers").get();
  if (snapshot.empty) {
    console.log("⚠️ No suppliers found in Firestore.");
    return;
  }

  let missing = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    const supplierZip =
      data?.address?.zip || data?.address?.postalCode || "";

    if (!supplierZip.trim()) {
      missing.push({
        id: doc.id,
        name: data.name || "(Unnamed supplier)",
        city: data.address?.city || "",
        state: data.address?.state || "",
      });
    }
  });

  if (missing.length === 0) {
    console.log("✅ All suppliers have ZIP/postal codes.");
  } else {
    console.log(`🚨 Found ${missing.length} supplier(s) missing ZIP codes:`);
    missing.forEach((s, i) => {
      console.log(
        `  ${i + 1}. ${s.name} (${s.id}) — ${s.city}, ${s.state || "N/A"}`
      );
    });
  }

  console.log("✨ Done.");
}

checkMissingZips().catch(err => {
  console.error("❌ Error checking Firestore:", err);
});