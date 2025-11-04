import React, { useEffect, useState } from "react";

type Supplier = {
  id: string;
  slug?: string;
  name: string;
  category?: string | null;
  categories?: string[];
  offerings?: string[];
  products?: string[];
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
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterError, setMasterError] = useState<string | null>(null);
  const [masterCategories, setMasterCategories] = useState<{ id: string; name: string }[]>([]);
  const [masterOfferings, setMasterOfferings] = useState<{ id: string; name: string; categoryId: string }[]>([]);
  const [masterProducts, setMasterProducts] = useState<{ id: string; name: string; offeringIds: string[] }[]>([]);

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

  const fetchMasterData = async () => {
    setMasterLoading(true);
    setMasterError(null);
    try {
      const response = await fetch("/api/admin/masterData");
      if (!response.ok) {
        throw new Error(`Failed to load master data (${response.status})`);
      }
      const data = await response.json();
      if (!data?.success) {
        throw new Error(data?.message || "Unknown master data error");
      }
      setMasterCategories(data.categories || []);
      setMasterOfferings(data.offerings || []);
      setMasterProducts(data.products || []);
    } catch (error: any) {
      console.error("Error fetching master data:", error);
      setMasterError(error?.message || "Failed to load master data");
    } finally {
      setMasterLoading(false);
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
    fetchMasterData();
  }, [filterIds]);

  const handleEdit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setEditedData({
      ...supplier,
      address: supplier.address ? { ...supplier.address } : undefined,
      categories: supplier.categories ? [...supplier.categories] : supplier.category ? [supplier.category] : [],
      offerings: supplier.offerings ? [...supplier.offerings] : [],
      products: supplier.products ? [...supplier.products] : [],
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

  const toggleMultiValue = (field: "categories" | "offerings" | "products", value: string) => {
    setEditedData((prev) => {
      if (!prev) return prev;
      const current = Array.isArray(prev[field]) ? [...(prev[field] as string[])] : [];
      const exists = current.includes(value);
      const next = exists ? current.filter((item) => item !== value) : [...current, value];
      return { ...prev, [field]: next };
    });
  };

  const diffSets = (initial: string[] = [], next: string[] = []) => {
    const initialSet = new Set(initial);
    const nextSet = new Set(next);
    const added = Array.from(nextSet).filter((value) => !initialSet.has(value));
    const removed = Array.from(initialSet).filter((value) => !nextSet.has(value));
    return { added, removed };
  };

  const syncAssociations = async (original: Supplier, updated: Supplier) => {
    const supplierId = original.id;
    const originalCategories = original.categories || (original.category ? [original.category] : []);
    const updatedCategories = updated.categories || [];
    const categoryDiff = diffSets(originalCategories, updatedCategories);

    for (const categoryId of categoryDiff.added) {
      await fetch("/api/admin/supplierCategories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, categoryId }),
      });
    }
    for (const categoryId of categoryDiff.removed) {
      await fetch("/api/admin/supplierCategories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, categoryId }),
      });
    }

    const originalOfferings = original.offerings || [];
    const updatedOfferings = updated.offerings || [];
    const offeringDiff = diffSets(originalOfferings, updatedOfferings);

    for (const offeringId of offeringDiff.added) {
      await fetch("/api/admin/supplierOfferings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, offeringId }),
      });
    }
    for (const offeringId of offeringDiff.removed) {
      await fetch("/api/admin/supplierOfferings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, offeringId }),
      });
    }

    const originalProducts = original.products || [];
    const updatedProducts = updated.products || [];
    const productDiff = diffSets(originalProducts, updatedProducts);

    for (const productId of productDiff.added) {
      await fetch("/api/admin/supplierProducts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, productId }),
      });
    }
    for (const productId of productDiff.removed) {
      await fetch("/api/admin/supplierProducts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, productId }),
      });
    }
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

    const primaryCategory = editedData.categories?.[0] ?? editedData.category ?? null;
    const categoriesForSave = editedData.categories ?? (primaryCategory ? [primaryCategory] : []);
    const offeringsForSave = editedData.offerings ?? [];
    const productsForSave = editedData.products ?? [];
    const updates: Record<string, unknown> = {
      name: editedData.name,
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

      const updatedSnapshot: Supplier = {
        ...editedData,
        category: primaryCategory,
        categories: categoriesForSave,
        offerings: offeringsForSave,
        products: productsForSave,
      };

      setSuppliers((prev) =>
        prev.map((supplier) =>
          supplier.id === docKey || supplier.slug === docKey
            ? {
                ...supplier,
                name: updatedSnapshot.name ?? supplier.name,
                category: updatedSnapshot.category ?? supplier.category,
                categories: updatedSnapshot.categories ?? supplier.categories,
                offerings: updatedSnapshot.offerings ?? supplier.offerings,
                products: updatedSnapshot.products ?? supplier.products,
                verified: updatedSnapshot.verified ?? supplier.verified,
                premium: updatedSnapshot.premium ?? supplier.premium,
                address: payloadAddress ? { ...supplier.address, ...payloadAddress } : supplier.address,
              }
            : supplier
        )
      );

      await syncAssociations(
        suppliers.find((s) => (s.id === docKey || s.slug === docKey)) ?? editedData,
        updatedSnapshot,
      );

      console.log("💾 Updated supplier:", updatedSnapshot.slug || updatedSnapshot.id || docKey, "ZIP →", trimmedZip ?? "(cleared)");
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
      {masterLoading && <p className="text-sm text-gray-500 mb-2">Loading reference data…</p>}
      {masterError && <p className="text-sm text-red-600 mb-2">{masterError}</p>}
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
                <th className="py-2 px-3 border">Offerings</th>
                <th className="py-2 px-3 border">Products</th>
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
                        <div className="flex flex-wrap gap-2">
                          {masterCategories.map((category) => {
                            const isActive = editedData?.categories?.includes(category.id);
                            return (
                              <button
                                key={category.id}
                                type="button"
                                aria-pressed={isActive}
                                className={`px-2 py-1 rounded border text-xs ${
                                  isActive
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white text-gray-700 border-gray-300"
                                }`}
                                onClick={() => toggleMultiValue("categories", category.id)}
                              >
                                {category.name}
                              </button>
                            );
                          })}
                        </div>
                      ) : supplier.categories && supplier.categories.length > 0 ? (
                        supplier.categories
                          .map((id) => masterCategories.find((c) => c.id === id)?.name || id)
                          .join(", ")
                      ) : supplier.category ? (
                        supplier.category
                      ) : (
                        <span className="text-gray-400 italic">None</span>
                      )}
                    </td>
                    <td className="border px-3 py-2">
                      {editingId === supplier.id ? (
                        <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1">
                          {masterOfferings.map((offering) => {
                            const isActive = editedData?.offerings?.includes(offering.id);
                            return (
                              <button
                                key={offering.id}
                                type="button"
                                aria-pressed={isActive}
                                className={`px-2 py-1 rounded border text-xs ${
                                  isActive
                                    ? "bg-green-600 text-white border-green-600"
                                    : "bg-white text-gray-700 border-gray-300"
                                }`}
                                onClick={() => toggleMultiValue("offerings", offering.id)}
                              >
                                {offering.name}
                              </button>
                            );
                          })}
                        </div>
                      ) : supplier.offerings && supplier.offerings.length > 0 ? (
                        supplier.offerings
                          .map((id) => masterOfferings.find((o) => o.id === id)?.name || id)
                          .join(", ")
                      ) : (
                        <span className="text-gray-400 italic">None</span>
                      )}
                    </td>
                    <td className="border px-3 py-2">
                      {editingId === supplier.id ? (
                        <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1">
                          {masterProducts.map((product) => {
                            const isActive = editedData?.products?.includes(product.id);
                            return (
                              <button
                                key={product.id}
                                type="button"
                                aria-pressed={isActive}
                                className={`px-2 py-1 rounded border text-xs ${
                                  isActive
                                    ? "bg-purple-600 text-white border-purple-600"
                                    : "bg-white text-gray-700 border-gray-300"
                                }`}
                                onClick={() => toggleMultiValue("products", product.id)}
                              >
                                {product.name}
                              </button>
                            );
                          })}
                        </div>
                      ) : supplier.products && supplier.products.length > 0 ? (
                        supplier.products
                          .map((id) => masterProducts.find((p) => p.id === id)?.name || id)
                          .join(", ")
                      ) : (
                        <span className="text-gray-400 italic">None</span>
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
