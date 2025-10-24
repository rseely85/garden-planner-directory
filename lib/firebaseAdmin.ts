import * as admin from "firebase-admin";

if (!admin.apps.length) {
  console.log("🔥 Initializing Firebase Admin via applicationDefault...");

  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId,
  });
}

const firebaseApp = admin.app();

// ✅ Always bind Firestore to the active app instance
const db = admin.firestore(firebaseApp);
const auth = admin.auth(firebaseApp);

export { firebaseApp, db, auth };

// ✅ Optional helper for consistency
export function getFirebaseAdmin() {
  return firebaseApp;
}