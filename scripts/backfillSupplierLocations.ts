import { getFirestore } from "firebase-admin/firestore";
import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import fs from "fs";
import path from "path";

// ✅ Initialize Firebase Admin (only once)
if (!getApps().length) {
  console.log("🌱 Initializing Firebase Admin (applicationDefault)");
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT || "garden-planner-directory",
  });
}

// ✅ Helper functions
function isValidString(value: any): boolean {
  return typeof value === "string" && value.trim() !== "";
}

function buildFullAddress(address: any): string {
  if (!address || typeof address !== "object") return "";
  const parts = [
    address.street,
    address.city,
    address.county ? `${address.county} County` : "",
    address.state,
    address.zip,
  ].filter(isValidString);
  return parts.join(", ");
}

// ✅ Main backfill logic
async function backfillSupplierLocations() {
  try {
    console.log("📡 Connecting to Firestore...");
    const db = getFirestore();
    const suppliersRef = db.collection("suppliers");
    const snapshot = await suppliersRef.get();

    if (snapshot.empty) {
      console.warn("⚠️ No supplier data found in Firestore.");
      return;
    }

    let updatedCount = 0;
    let skippedCount = 0;
    const updatedSuppliers: { id: string; name: string; newLocation: string }[] = [];
    const skippedSuppliers: { id: string; name: string; reason: string }[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const currentLocation = data.location;
      const derivedLocation = buildFullAddress(data.address);
      const name = typeof data.name === "string" ? data.name : "";

      if (!isValidString(currentLocation) && isValidString(derivedLocation)) {
        console.log(`📝 Updating ${doc.id} → ${derivedLocation}`);
        await doc.ref.update({ location: derivedLocation });
        updatedCount++;
        updatedSuppliers.push({ id: doc.id, name, newLocation: derivedLocation });
      } else {
        skippedCount++;
        let reason = "";
        if (isValidString(currentLocation)) {
          reason = "Location already set";
        } else if (!isValidString(derivedLocation)) {
          reason = "Derived location invalid or empty";
        } else {
          reason = "Unknown reason";
        }
        skippedSuppliers.push({ id: doc.id, name, reason });
      }
    }

    console.log(`✅ Done! ${updatedCount} supplier(s) updated, ${skippedCount} skipped.`);

    // Write JSON report
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const logsDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir);
    }
    const reportPath = path.join(logsDir, `backfillReport_${timestamp}.json`);
    const reportData = {
      timestamp,
      totalSuppliers: snapshot.size,
      updatedSuppliers,
      skippedSuppliers,
    };
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2), "utf-8");
    console.log(`🧾 Report saved to ${reportPath}`);
  } catch (err: any) {
    console.error("🔥 Backfill failed:", err.message);
  }
}

// ✅ Allow script to be run directly with `npm run backfill:locations`
if (require.main === module) {
  backfillSupplierLocations();
}