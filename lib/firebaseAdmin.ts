// lib/firebaseAdmin.ts
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: "garden-planner-directory",
  });
}

export const adminDb = admin.firestore();