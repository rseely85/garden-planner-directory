import { getFirestore } from "firebase-admin/firestore";
import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";

if (!getApps().length) {
  console.log("🌱 Initializing Firebase Admin (applicationDefault)");
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT || "garden-planner-directory",
  });
}

/**
 * Rebuild a supplier's full location string from address fields.
 */
function buildFullAddress(address: any): string {
  if (!address || typeof address !== "object") return "";
  const parts = [
    address.street,
    address.city,
    address.county ? `${address.county} County` : "",
    address.state,
    address.zip,
  ].filter((part) => typeof part === "string" && part.trim() !== "");
  return parts.join(", ");
}

/**
 * Backfills missing location fields in Firestore supplier records.
 * Returns a summary object used by API routes and dashboards.
 */
export async function backfillSupplierLocations() {
  try {
    console.log("📡 Connecting to Firestore...");
    const db = getFirestore();
    const suppliersRef = db.collection("suppliers");
    const snapshot = await suppliersRef.get();

    if (snapshot.empty) {
      console.warn("⚠️ No suppliers found in Firestore.");
      return { updated: 0, skipped: 0, message: "No suppliers found." };
    }

    let updated = 0;
    let skipped = 0;
    const updates: any[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const fullAddress = buildFullAddress(data.address);

      if (data.location && data.location.trim() !== "") {
        skipped++;
        continue;
      }

      if (!fullAddress) {
        skipped++;
        continue;
      }

      await doc.ref.update({ location: fullAddress });
      updates.push({
        id: doc.id,
        name: data.name || "",
        newLocation: fullAddress,
      });
      updated++;
    }

    const result = {
      success: true,
      message: `✅ Done! ${updated} supplier(s) updated, ${skipped} skipped.`,
      updatedCount: updated,
      skippedCount: skipped,
      updates,
    };

    console.log(result.message);
    return result;
  } catch (error: any) {
    console.error("🔥 Firestore backfill error:", error.message);
    return {
      success: false,
      message: `❌ Error: ${error.message}`,
      updatedCount: 0,
      skippedCount: 0,
      updates: [],
    };
  }
}

// For manual testing in Node
if (require.main === module) {
  backfillSupplierLocations().then((res) => console.log(res));
}