

import React, { useEffect, useState } from "react";

type Supplier = {
  id: string;
  name: string;
  category: string;
  verified: boolean;
  premium: boolean;
  city?: string;
  state?: string;
};

const SupplierEditor: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Partial<Supplier>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Fetch suppliers from Firestore API
  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/suppliers");
      const data = await response.json();
      if (data.success) {
        setSuppliers(data.suppliers);
      } else {
        console.error("Failed to fetch suppliers:", data.message);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleEdit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setEditedData(supplier);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedData({});
  };

  const handleChange = (field: keyof Supplier, value: any) => {
    setEditedData({ ...editedData, [field]: value });
  };

  const handleSave = async (id: string) => {
    try {
      const response = await fetch("/api/admin/updateSupplier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, updates: editedData }),
      });
      const result = await response.json();
      if (result.success) {
        setSuppliers((prev) =>
          prev.map((s) => (s.id === id ? { ...s, ...editedData } : s))
        );
        setMessage("✅ Supplier updated successfully.");
      } else {
        setMessage("❌ Failed to update supplier: " + result.message);
      }
    } catch (error) {
      console.error("Error updating supplier:", error);
      setMessage("❌ Error saving changes.");
    } finally {
      setEditingId(null);
      setEditedData({});
      setTimeout(() => setMessage(null), 4000);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mt-6">
      <h2 className="text-xl font-semibold mb-4">Supplier Editor</h2>
      {message && (
        <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">{message}</div>
      )}
      {loading ? (
        <p className="text-gray-500">Loading suppliers...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300 rounded-md">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="py-2 px-3 border">Name</th>
                <th className="py-2 px-3 border">Category</th>
                <th className="py-2 px-3 border">Verified</th>
                <th className="py-2 px-3 border">Premium</th>
                <th className="py-2 px-3 border">City</th>
                <th className="py-2 px-3 border">State</th>
                <th className="py-2 px-3 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50">
                  <td className="border px-3 py-2">
                    {editingId === supplier.id ? (
                      <input
                        type="text"
                        className="border p-1 w-full"
                        value={editedData.name || ""}
                        onChange={(e) => handleChange("name", e.target.value)}
                      />
                    ) : (
                      supplier.name
                    )}
                  </td>
                  <td className="border px-3 py-2">
                    {editingId === supplier.id ? (
                      <input
                        type="text"
                        className="border p-1 w-full"
                        value={editedData.category || ""}
                        onChange={(e) => handleChange("category", e.target.value)}
                      />
                    ) : (
                      supplier.category
                    )}
                  </td>
                  <td className="border px-3 py-2 text-center">
                    {editingId === supplier.id ? (
                      <input
                        type="checkbox"
                        checked={editedData.verified || false}
                        onChange={(e) => handleChange("verified", e.target.checked)}
                      />
                    ) : supplier.verified ? (
                      "✅"
                    ) : (
                      "❌"
                    )}
                  </td>
                  <td className="border px-3 py-2 text-center">
                    {editingId === supplier.id ? (
                      <input
                        type="checkbox"
                        checked={editedData.premium || false}
                        onChange={(e) => handleChange("premium", e.target.checked)}
                      />
                    ) : supplier.premium ? (
                      "⭐"
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="border px-3 py-2">
                    {editingId === supplier.id ? (
                      <input
                        type="text"
                        className="border p-1 w-full"
                        value={editedData.city || ""}
                        onChange={(e) => handleChange("city", e.target.value)}
                      />
                    ) : (
                      supplier.city || "-"
                    )}
                  </td>
                  <td className="border px-3 py-2">
                    {editingId === supplier.id ? (
                      <input
                        type="text"
                        className="border p-1 w-full"
                        value={editedData.state || ""}
                        onChange={(e) => handleChange("state", e.target.value)}
                      />
                    ) : (
                      supplier.state || "-"
                    )}
                  </td>
                  <td className="border px-3 py-2 text-center">
                    {editingId === supplier.id ? (
                      <div className="flex gap-2 justify-center">
                        <button
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                          onClick={() => handleSave(supplier.id)}
                        >
                          Save
                        </button>
                        <button
                          className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                          onClick={handleCancel}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        onClick={() => handleEdit(supplier)}
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SupplierEditor;