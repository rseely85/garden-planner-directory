// lib/firebaseAdmin.ts
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  console.log("🔥 Initializing Firebase Admin via applicationDefault...");
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

export const getFirestore = () => db;
export { admin, db };