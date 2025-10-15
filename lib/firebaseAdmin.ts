// lib/firebaseAdmin.ts
import admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    console.log("🔥 Initializing Firebase Admin via applicationDefault...");
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: "garden-planner-directory",
    });
  } catch (error) {
    console.error("❌ Firebase Admin initialization failed:", error);
  }
}

export const db = admin.firestore();
export { admin };