import * as admin from "firebase-admin";
import * as fs from "fs";
import * as yaml from "js-yaml";
import path from "path";

async function seedNYRegions() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }

  const db = admin.firestore();

  // Path to your YAML file
  const filePath = path.resolve("data/regions/geo-data.yaml");

  console.log("Reading YAML data...");
  const fileContents = fs.readFileSync(filePath, "utf8");
  const allData: Record<string, any> = yaml.load(fileContents) as Record<string, any>;

  console.log("Filtering for New York entries...");
  const nyData = Object.entries(allData).filter(
    ([, entry]) =>
      entry?.state === "New York" || entry?.state_abbr === "NY"
  );

  console.log(`Found ${nyData.length} ZIP codes for New York.`);

  let batch = db.batch();
  const regionRef = db.collection("regions").doc("NY").collection("zips");

  let counter = 0;
  for (const [zip, info] of nyData) {
    const docRef = regionRef.doc(zip.toString());
    batch.set(docRef, info);
    counter++;

    // Commit every 400 writes to stay within batch limits
    if (counter % 400 === 0) {
      await batch.commit();
      console.log(`Committed ${counter} so far...`);
      batch = db.batch();
    }
  }

  // Final commit
  if (counter % 400 !== 0) {
    await batch.commit();
  }

  console.log(`✅ Done! Seeded ${counter} NY ZIP region records.`);
}

seedNYRegions().catch(console.error);