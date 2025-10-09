import { getSuppliers } from "../lib/firestore.js";

(async () => {
  try {
    console.log("🔍 Testing Firestore connection...\n");
    const suppliers = await getSuppliers();
    console.log("✅ Suppliers fetched:\n", suppliers);
  } catch (error) {
    console.error("❌ Error fetching suppliers:", error);
  }
})();