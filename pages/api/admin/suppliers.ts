import { getFirestore } from "firebase-admin/firestore";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

let db;

if (!getApps().length) {
  const adminApp = getFirebaseAdmin();
  db = getFirestore(adminApp);
} else {
  db = getFirestore();
}

export default async function handler(req, res) {
  try {
    const snapshot = await db.collection("suppliers").get();

    const suppliers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ success: true, suppliers });
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch supplier data.",
      error: error.message,
    });
  }
}