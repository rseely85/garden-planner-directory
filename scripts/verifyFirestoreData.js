// scripts/verifyFirestoreData.js
/**
 * Firestore Data Integrity Checker
 * --------------------------------
 * Scans supplier documents and validates field consistency.
 * Outputs both console summary and a timestamped JSON report.
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Initialize Firestore (ADC or service account)
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "garden-planner-directory",
});

const db = admin.firestore();

async function verifySuppliers() {
  console.log("🔍 Starting Firestore data integrity check...\n");

  const report = {
    timestamp: new Date().toISOString(),
    valid: [],
    warnings: [],
    errors: [],
  };

  const suppliersSnapshot = await db.collection("suppliers").get();

  for (const doc of suppliersSnapshot.docs) {
    const data = doc.data();
    const id = doc.id;
    const issues = [];

    // --- Basic field checks ---
    if (!data.id) issues.push("Missing 'id'");
    if (!data.slug) issues.push("Missing 'slug'");
    if (data.slug && data.slug !== id)
      issues.push(`Slug mismatch (slug=${data.slug}, id=${id})`);
    if (!data.name) issues.push("Missing 'name'");
    if (!Array.isArray(data.services))
      issues.push("Services not an array or missing");
    if (!Array.isArray(data.products))
      issues.push("Products not an array or missing");
    if (!data.website) issues.push("Missing 'website'");

    // --- Geo field validation ---
    if (data.geo) {
      if (
        typeof data.geo.lat !== "number" ||
        typeof data.geo.lng !== "number"
      ) {
        issues.push("Geo coordinates invalid");
      }
    } else {
      issues.push("Missing 'geo'");
    }

    // --- Categorize ---
    if (issues.length === 0) {
      report.valid.push(id);
      console.log(`✅ ${id}: OK`);
    } else {
      const entry = { id, issues };
      if (issues.some((i) => i.includes("Missing")))
        report.errors.push(entry);
      else report.warnings.push(entry);
      console.log(`⚠️  ${id}: ${issues.join(", ")}`);
    }
  }

  // --- Summary ---
  console.log("\n📋 Summary:");
  console.log(`  ✅ Valid: ${report.valid.length}`);
  console.log(`  ⚠️  Warnings: ${report.warnings.length}`);
  console.log(`  ❌ Errors: ${report.errors.length}`);

  // --- Save report to /logs/ ---
  const logsDir = path.resolve(process.cwd(), "logs");
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .split("Z")[0];
  const reportPath = path.join(logsDir, `dataIntegrityReport_${timestamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n🧾 Report saved to ${reportPath}`);
  console.log("✅ Integrity check complete.\n");
}

verifySuppliers().catch((err) => {
  console.error("❌ Error verifying Firestore data:", err);
  process.exit(1);
});