import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

async function run() {
  if (!getApps().length) {
    initializeApp({
      credential: applicationDefault(),
      projectId: process.env.GOOGLE_CLOUD_PROJECT || "garden-planner-directory",
    });
  }

  const idArg = process.argv[2] || "buffalo-landscape-supply";
  const db = getFirestore();
  const doc = await db.collection("suppliers").doc(idArg).get();
  if (!doc.exists) {
    console.error(`Doc ${idArg} not found`);
    return;
  }
  console.log(JSON.stringify(doc.data(), null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
