import React, { useEffect, useState } from "react";

type Supplier = {
  id: string;
  slug?: string;
  name: string;
  category: string;
  verified: boolean;
  premium: boolean;
  address?: {
    city?: string;
    state?: string;
    zip?: string;
    street?: string;
    postalCode?: string;
  };
};

interface SupplierEditorProps {
  filterIds?: string[];
  onMissingZipResolved?: () => void;
  pageSize?: number;
}

const SupplierEditor: React.FC<SupplierEditorProps> = ({ filterIds, onMissingZipResolved, pageSize = 5 }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch suppliers (all or filtered)
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

  // Refresh all data
  const refreshAll = async () => {
    await fetchSuppliers();
    console.log("♻️ Data refreshed after save");
  };

  // Re-fetch when filters change
  useEffect(() => {
    fetchSuppliers();
  }, [filterIds]);

  const handleEdit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setEditedData({
      ...supplier,
      address: supplier.address ? { ...supplier.address } : undefined,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedData(null);
  };

  const handleFieldChange = <K extends keyof Omit<Supplier, "id" | "address">>(field: K, value: Supplier[K]) => {
    setEditedData((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleAddressChange = (
    field: keyof NonNullable<Supplier["address"]>,
    value: string
  ) => {
    setEditedData((prev) => {
      if (!prev) return prev;
      const nextAddress = { ...(prev.address ?? {}) };
      if (field === "zip" || field === "postalCode") {
        nextAddress.zip = value;
        nextAddress.postalCode = value;
      } else {
        nextAddress[field] = value;
      }
      return { ...prev, address: nextAddress };
    });
  };

  const handleSave = async (fallbackId: string) => {
    if (!editedData) {
      console.warn("No supplier data staged for save");
      return;
    }

    const docKey = editedData.slug ?? editedData.id ?? fallbackId;
    if (!docKey) {
      console.error("❌ No valid docRef for supplier", editedData);
      setMessage({ type: "error", text: "Unable to resolve supplier record." });
      return;
    }

    const rawZip = editedData.address?.zip ?? editedData.address?.postalCode;
    const trimmedZip = rawZip ? rawZip.toString().trim() : undefined;
    if (trimmedZip && trimmedZip.length < 5) {
      setMessage({ type: "error", text: "ZIP codes must be at least 5 characters." });
      return;
    }

    const payloadAddress =
      editedData.address &&
      (() => {
        const city = editedData.address.city?.trim();
        const state = editedData.address.state?.trim();
        const street = editedData.address.street?.trim();
        const addressPayload: NonNullable<Supplier["address"]> = {
          ...editedData.address,
          ...(city !== undefined ? { city } : {}),
          ...(state !== undefined ? { state } : {}),
          ...(street !== undefined ? { street } : {}),
        };
        if (trimmedZip !== undefined) {
          addressPayload.zip = trimmedZip;
          addressPayload.postalCode = trimmedZip;
        }
        return addressPayload;
      })();

    const updates: Record<string, unknown> = {
      name: editedData.name,
      category: editedData.category,
      verified: editedData.verified,
      premium: editedData.premium,
      address: payloadAddress,
    };

    try {
      const response = await fetch("/api/admin/updateSupplier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: docKey, updates }),
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to update supplier");
      }

      setSuppliers((prev) =>
        prev.map((supplier) =>
          supplier.id === docKey || supplier.slug === docKey
            ? {
                ...supplier,
                name: editedData.name ?? supplier.name,
                category: editedData.category ?? supplier.category,
                verified: editedData.verified ?? supplier.verified,
                premium: editedData.premium ?? supplier.premium,
                address: payloadAddress ? { ...supplier.address, ...payloadAddress } : supplier.address,
              }
            : supplier
        )
      );

      console.log("💾 Updated supplier:", editedData.slug || editedData.id || docKey, "ZIP →", trimmedZip ?? "(cleared)");
      await refreshAll();
      if (hasMissingZipFilter && typeof onMissingZipResolved === "function") {
        onMissingZipResolved();
      }
      setMessage({ type: "success", text: "Supplier updated successfully." });
    } catch (error) {
      console.error("❌ Failed to update supplier:", error);
      setMessage({ type: "error", text: "Error saving changes." });
    } finally {
      setEditingId(null);
      setEditedData(null);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const getSupplierZip = (supplier: Supplier) =>
    supplier.address?.zip || supplier.address?.postalCode || "";

  const filterList = Array.isArray(filterIds) ? filterIds : [];
  const hasMissingZipFilter = filterList.length > 0;

  useEffect(() => {
    const activeIds = Array.isArray(filterIds) ? filterIds : [];
    console.log("🪄 Active filter IDs:", activeIds);
    if (activeIds.length > 0) {
      const filtered = suppliers.filter((supplier) => {
        const matchKey = supplier.slug || supplier.id;
        return matchKey ? activeIds.includes(matchKey) : false;
      });
      console.log("🧾 Filtered suppliers:", filtered.map((supplier) => supplier.name));
      setFilteredSuppliers(filtered);
    } else {
      console.log("🧾 Filtered suppliers:", suppliers.map((supplier) => supplier.name));
      setFilteredSuppliers(suppliers);
    }
    setCurrentPage(1);
  }, [filterIds, suppliers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterIds]);

  const totalPages = Math.max(1, Math.ceil(filteredSuppliers.length / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedSuppliers = filteredSuppliers.slice(pageStart, pageStart + pageSize);

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mt-6">
      <h2 className="text-xl font-semibold mb-4">Supplier Editor</h2>
      {message && (
        <div
          className={`mb-4 p-2 rounded ${
            message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}
      {hasMissingZipFilter && (
        <div className="mb-4 text-sm text-blue-600">
          <p>
            Showing {filteredSuppliers.length} supplier{filteredSuppliers.length === 1 ? "" : "s"} with missing ZIPs.
          </p>
          {filteredSuppliers.length === 0 && (
            <em className="text-gray-500">No suppliers match the selected filter.</em>
          )}
        </div>
      )}
      {loading ? (
        <p className="text-gray-500">Loading suppliers...</p>
      ) : filteredSuppliers.length === 0 ? (
        <p className="text-gray-500">No suppliers to display</p>
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
                <th className="py-2 px-3 border">ZIP</th>
                <th className="py-2 px-3 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSuppliers.map((supplier) => {
                const supplierZip = getSupplierZip(supplier);
                return (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="border px-3 py-2">
                      {editingId === supplier.id ? (
                        <input
                          type="text"
                          className="border p-1 w-full"
                          value={editedData?.name ?? ""}
                          onChange={(e) => handleFieldChange("name", e.target.value)}
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
                          value={editedData?.category ?? ""}
                          onChange={(e) => handleFieldChange("category", e.target.value)}
                        />
                      ) : (
                        supplier.category
                      )}
                    </td>
                    <td className="border px-3 py-2 text-center">
                      {editingId === supplier.id ? (
                        <input
                          type="checkbox"
                          checked={editedData?.verified ?? false}
                          onChange={(e) => handleFieldChange("verified", e.target.checked)}
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
                          checked={editedData?.premium ?? false}
                          onChange={(e) => handleFieldChange("premium", e.target.checked)}
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
                          value={editedData?.address?.city ?? ""}
                          onChange={(e) => handleAddressChange("city", e.target.value)}
                        />
                      ) : (
                        supplier.address?.city || "-"
                      )}
                    </td>
                    <td className="border px-3 py-2">
                      {editingId === supplier.id ? (
                        <input
                          type="text"
                          className="border p-1 w-full"
                          value={editedData?.address?.state ?? ""}
                          onChange={(e) => handleAddressChange("state", e.target.value)}
                        />
                      ) : (
                        supplier.address?.state || "-"
                      )}
                    </td>
                    <td className="border px-3 py-2">
                      {editingId === supplier.id ? (
                        <input
                          type="text"
                          className="border p-1 w-full"
                          value={editedData?.address?.zip ?? editedData?.address?.postalCode ?? ""}
                          onChange={(e) => handleAddressChange("zip", e.target.value)}
                        />
                      ) : (
                        supplierZip || "-"
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
                );
              })}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
              <span>
                Showing {pageStart + 1}-{Math.min(pageStart + pageSize, filteredSuppliers.length)} of {filteredSuppliers.length}
              </span>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 border rounded disabled:opacity-50"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Prev
                </button>
                <span>Page {currentPage} / {totalPages}</span>
                <button
                  className="px-3 py-1 border rounded disabled:opacity-50"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SupplierEditor;
