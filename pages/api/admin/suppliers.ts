import { getAllSuppliersAdmin } from "@/lib/data/suppliers";

export default async function handler(req, res) {
  try {
    const suppliers = await getAllSuppliersAdmin();
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
