import React, { useEffect, useMemo, useState } from "react";
import { ensureSupplierAddress } from "@/lib/utils/ensureSupplierAddress";

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
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    regionId?: string | null;
  };
};

type FilterState = {
  categoryId: string;
  offeringId: string;
  productId: string;
  verified: "all" | "verified" | "unverified";
  premium: "all" | "premium" | "non-premium";
  regionId: string;
  city: string;
  zip: string;
};

const DEFAULT_FILTERS: FilterState = {
  categoryId: "",
  offeringId: "",
  productId: "",
  verified: "all",
  premium: "all",
  regionId: "",
  city: "",
  zip: "",
};

const normalizeZip = (value: string | number | undefined | null): string => {
  if (value === undefined || value === null) {
    return "";
  }
  const cleaned = String(value).trim().replace(/\D/g, "");
  return cleaned.length > 5 ? cleaned.slice(0, 5) : cleaned;
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
  const [masterRegions, setMasterRegions] = useState<{ id: string; name: string; zipCodes?: string[] }[]>([]);

  const [pendingFilters, setPendingFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [activeFilters, setActiveFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const filteredOfferings = useMemo(() => {
    if (!pendingFilters.categoryId) {
      return masterOfferings;
    }
    return masterOfferings.filter((offering) => offering.categoryId === pendingFilters.categoryId);
  }, [masterOfferings, pendingFilters.categoryId]);

  const filteredProducts = useMemo(() => {
    if (pendingFilters.offeringId) {
      return masterProducts.filter((product) => product.offeringIds.includes(pendingFilters.offeringId));
    }
    if (pendingFilters.categoryId) {
      const allowedOfferingIds = masterOfferings
        .filter((offering) => offering.categoryId === pendingFilters.categoryId)
        .map((offering) => offering.id);
      return masterProducts.filter((product) => product.offeringIds.some((id) => allowedOfferingIds.includes(id)));
    }
    return masterProducts;
  }, [masterProducts, masterOfferings, pendingFilters.offeringId, pendingFilters.categoryId]);

  const regionZipMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    masterRegions.forEach((region) => {
      const zips = Array.isArray(region.zipCodes) ? region.zipCodes : [];
      if (zips.length > 0) {
        map.set(
          region.id,
          new Set(
            zips
              .map((zip) => normalizeZip(zip))
              .filter((zip) => zip.length > 0),
          ),
        );
      }
    });
    return map;
  }, [masterRegions]);

  const allValidZips = useMemo(() => {
    const set = new Set<string>();
    regionZipMap.forEach((zipSet) => {
      zipSet.forEach((zip) => set.add(zip));
    });
    return set;
  }, [regionZipMap]);

  const filtersDirty = useMemo(() => JSON.stringify(pendingFilters) !== JSON.stringify(activeFilters), [pendingFilters, activeFilters]);
  const hasActiveFilters = useMemo(
    () => JSON.stringify(activeFilters) !== JSON.stringify(DEFAULT_FILTERS),
    [activeFilters],
  );

  // Fetch suppliers (all or filtered)
  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/suppliers");
      const data = await response.json();
      if (data.success) {
        const normalized =
          Array.isArray(data.suppliers) && data.suppliers.length > 0
            ? (data.suppliers as Supplier[]).map((supplier) => ensureSupplierAddress<Supplier>(supplier))
            : [];
        setSuppliers(normalized);
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
      setMasterRegions(data.regions || []);
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

  const handleAddressChange = (field: keyof NonNullable<Supplier["address"]>, value: string) => {
    setEditedData((prev) => {
      if (!prev) return prev;
      const nextAddress = { ...(prev.address ?? {}) };
      nextAddress[field] = value;
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

  const updatePendingFilters = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setPendingFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleCategorySelect = (categoryId: string) => {
    setPendingFilters((prev) => ({
      ...prev,
      categoryId,
      offeringId: "",
      productId: "",
    }));
  };

  const handleOfferingSelect = (offeringId: string) => {
    setPendingFilters((prev) => ({
      ...prev,
      offeringId,
      productId: "",
    }));
  };

  const handleApplyFilters = () => {
    setActiveFilters({ ...pendingFilters });
    setCurrentPage(1);
    console.log("🎛️ Applying supplier filters:", pendingFilters);
  };

  const handleClearFilters = () => {
    if (!hasActiveFilters && !filtersDirty) {
      return;
    }
    const reset = { ...DEFAULT_FILTERS };
    setPendingFilters(reset);
    setActiveFilters(reset);
    setCurrentPage(1);
    console.log("♻️ Cleared supplier filters");
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

    const rawZip = editedData.address?.zip ?? null;
    const normalizedZip = normalizeZip(rawZip);
    const zipForSave = normalizedZip.length > 0 ? normalizedZip : undefined;

    if (zipForSave && zipForSave.length !== 5) {
      setMessage({ type: "error", text: "ZIP codes must be 5 numeric characters." });
      return;
    }

    if (zipForSave && allValidZips.size > 0 && !allValidZips.has(zipForSave)) {
      setMessage({ type: "error", text: `ZIP ${zipForSave} is not part of the configured regions.` });
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
        if (zipForSave !== undefined) {
          addressPayload.zip = zipForSave;
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

      console.log("💾 Updated supplier:", updatedSnapshot.slug || updatedSnapshot.id || docKey, "ZIP →", zipForSave ?? "(cleared)");
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

  const getSupplierZip = (supplier: Supplier) => {
    const rawZip = supplier.address?.zip ?? null;
    return normalizeZip(rawZip);
  };

  const filterList = useMemo(
    () =>
      Array.isArray(filterIds)
        ? filterIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        : [],
    [filterIds],
  );
  const hasMissingZipFilter = filterList.length > 0;
  const filterIdKey = filterList.join("|");

  useEffect(() => {
    const idSet = new Set(filterList);
    const next = suppliers.filter((supplier) => {
      if (idSet.size > 0) {
        const matchKey = supplier.slug || supplier.id;
        if (!matchKey || !idSet.has(matchKey)) {
          return false;
        }
      }

      const categories = supplier.categories && supplier.categories.length > 0
        ? supplier.categories
        : supplier.category
        ? [supplier.category]
        : [];

      if (activeFilters.categoryId && !categories.includes(activeFilters.categoryId)) {
        return false;
      }

      if (activeFilters.offeringId && !(supplier.offerings || []).includes(activeFilters.offeringId)) {
        return false;
      }

      if (activeFilters.productId && !(supplier.products || []).includes(activeFilters.productId)) {
        return false;
      }

      const isVerified = supplier.verified === true;
      if (activeFilters.verified === "verified" && !isVerified) {
        return false;
      }
      if (activeFilters.verified === "unverified" && isVerified) {
        return false;
      }

      const isPremium = supplier.premium === true;
      if (activeFilters.premium === "premium" && !isPremium) {
        return false;
      }
      if (activeFilters.premium === "non-premium" && isPremium) {
        return false;
      }

      const cityTerm = activeFilters.city.trim().toLowerCase();
      if (cityTerm) {
        const supplierCity = supplier.address?.city?.toLowerCase() ?? "";
        if (!supplierCity.includes(cityTerm)) {
          return false;
        }
      }

      const supplierZip = getSupplierZip(supplier);
      const zipTerm = normalizeZip(activeFilters.zip);
      if (zipTerm) {
        if (!supplierZip.startsWith(zipTerm)) {
          return false;
        }
      }

      if (activeFilters.regionId) {
        const supplierRegion = supplier.address?.regionId ?? null;
        if (!supplierRegion || supplierRegion !== activeFilters.regionId) {
          const allowedZips = regionZipMap.get(activeFilters.regionId);
          if (!allowedZips || !supplierZip || !allowedZips.has(supplierZip)) {
            return false;
          }
        }
      }

      return true;
    });

    console.log("🧾 Filtered suppliers:", next.map((supplier) => supplier.name));
    setFilteredSuppliers(next);
  }, [suppliers, filterIdKey, filterList, activeFilters, regionZipMap]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterIdKey, activeFilters]);

  const totalPages = Math.max(1, Math.ceil(filteredSuppliers.length / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedSuppliers = filteredSuppliers.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Filters</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1 min-w-[170px]">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">Category</label>
            <select
              className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
              value={pendingFilters.categoryId}
              onChange={(e) => handleCategorySelect(e.target.value)}
            >
              <option value="">All Categories</option>
              {masterCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[170px]">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">Offering</label>
            <select
              className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
              value={pendingFilters.offeringId}
              onChange={(e) => handleOfferingSelect(e.target.value)}
              disabled={filteredOfferings.length === 0}
            >
              <option value="">All Offerings</option>
              {filteredOfferings.map((offering) => (
                <option key={offering.id} value={offering.id}>
                  {offering.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[170px]">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">Product</label>
            <select
              className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
              value={pendingFilters.productId}
              onChange={(e) => updatePendingFilters("productId", e.target.value)}
              disabled={filteredProducts.length === 0}
            >
              <option value="">All Products</option>
              {filteredProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[140px]">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">Verified</label>
            <select
              className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
              value={pendingFilters.verified}
              onChange={(e) => updatePendingFilters("verified", e.target.value as FilterState["verified"])}
            >
              <option value="all">All</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">Premium</label>
            <select
              className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
              value={pendingFilters.premium}
              onChange={(e) => updatePendingFilters("premium", e.target.value as FilterState["premium"])}
            >
              <option value="all">All</option>
              <option value="premium">Premium</option>
              <option value="non-premium">Non-Premium</option>
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[180px]">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">Region</label>
            <select
              className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
              value={pendingFilters.regionId}
              onChange={(e) => updatePendingFilters("regionId", e.target.value)}
              disabled={masterRegions.length === 0}
            >
              <option value="">All Regions</option>
              {masterRegions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[150px]">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">City</label>
            <input
              type="text"
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              placeholder="City"
              value={pendingFilters.city}
              onChange={(e) => updatePendingFilters("city", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1 min-w-[120px]">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">ZIP</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              placeholder="ZIP"
              value={pendingFilters.zip}
              onChange={(e) => updatePendingFilters("zip", normalizeZip(e.target.value))}
            />
          </div>

          <div className="flex gap-2 pb-1">
            <button
              type="button"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              onClick={handleApplyFilters}
              disabled={!filtersDirty}
            >
              Apply
            </button>
            <button
              type="button"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters && !filtersDirty}
            >
              Clear
            </button>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4">
        {filtersDirty && (
          <p className="text-xs text-amber-600">
            Filters edited — click Apply to refresh the supplier list.
          </p>
        )}
        {hasActiveFilters && (
          <p className="text-sm text-gray-600">
            Showing {filteredSuppliers.length} of {suppliers.length} suppliers with the current filters.
          </p>
        )}
        {hasMissingZipFilter && (
          <div className="text-sm text-blue-600">
            <p>
              Missing ZIP focus: {filteredSuppliers.length} supplier{filteredSuppliers.length === 1 ? "" : "s"} remain.
            </p>
            {filteredSuppliers.length === 0 && (
              <em className="text-gray-500">No suppliers match the selected filter.</em>
            )}
          </div>
        )}
        {masterLoading && <p className="text-sm text-gray-500">Loading reference data…</p>}
        {masterError && <p className="text-sm text-red-600">{masterError}</p>}
        {message && (
          <div
            className={`rounded p-2 ${
              message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading suppliers...</p>
        ) : filteredSuppliers.length === 0 ? (
          <p className="text-gray-500">No suppliers to display</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Offerings</th>
                  <th className="px-3 py-2">Products</th>
                  <th className="px-3 py-2 text-center">Verified</th>
                  <th className="px-3 py-2 text-center">Premium</th>
                  <th className="px-3 py-2">City</th>
                  <th className="px-3 py-2">State</th>
                  <th className="px-3 py-2">ZIP</th>
                  <th className="px-3 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedSuppliers.map((supplier) => {
                  const supplierZip = getSupplierZip(supplier);
                  return (
                    <tr key={supplier.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 align-top text-gray-800 font-medium">
                        {editingId === supplier.id ? (
                          <input
                            type="text"
                            className="w-full rounded border border-gray-300 p-1"
                            value={editedData?.name ?? ""}
                            onChange={(e) => handleFieldChange("name", e.target.value)}
                          />
                        ) : (
                          supplier.name
                        )}
                      </td>
                      <td className="px-3 py-2 align-top text-gray-700">
                        {editingId === supplier.id ? (
                          <div className="flex flex-wrap gap-2">
                            {masterCategories.map((category) => {
                              const isActive = editedData?.categories?.includes(category.id);
                              return (
                                <button
                                  key={category.id}
                                  type="button"
                                  aria-pressed={isActive}
                                  className={`px-2 py-1 text-xs ${
                                    isActive
                                      ? "rounded border border-blue-600 bg-blue-600 text-white"
                                      : "rounded border border-gray-300 bg-white text-gray-700"
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
                          <span className="italic text-gray-400">None</span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top text-gray-700">
                        {editingId === supplier.id ? (
                          <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto pr-1">
                            {masterOfferings.map((offering) => {
                              const isActive = editedData?.offerings?.includes(offering.id);
                              return (
                                <button
                                  key={offering.id}
                                  type="button"
                                  aria-pressed={isActive}
                                  className={`px-2 py-1 text-xs ${
                                    isActive
                                      ? "rounded border border-green-600 bg-green-600 text-white"
                                      : "rounded border border-gray-300 bg-white text-gray-700"
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
                          <span className="italic text-gray-400">None</span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top text-gray-700">
                        {editingId === supplier.id ? (
                          <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto pr-1">
                            {masterProducts.map((product) => {
                              const isActive = editedData?.products?.includes(product.id);
                              return (
                                <button
                                  key={product.id}
                                  type="button"
                                  aria-pressed={isActive}
                                  className={`px-2 py-1 text-xs ${
                                    isActive
                                      ? "rounded border border-purple-600 bg-purple-600 text-white"
                                      : "rounded border border-gray-300 bg-white text-gray-700"
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
                          <span className="italic text-gray-400">None</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-700">
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
                      <td className="px-3 py-2 text-center text-gray-700">
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
                      <td className="px-3 py-2 align-top text-gray-700">
                        {editingId === supplier.id ? (
                          <input
                            type="text"
                            className="w-full rounded border border-gray-300 p-1"
                            value={editedData?.address?.city ?? ""}
                            onChange={(e) => handleAddressChange("city", e.target.value)}
                          />
                        ) : (
                          supplier.address?.city || "-"
                        )}
                      </td>
                      <td className="px-3 py-2 align-top text-gray-700">
                        {editingId === supplier.id ? (
                          <input
                            type="text"
                            className="w-full rounded border border-gray-300 p-1"
                            value={editedData?.address?.state ?? ""}
                            onChange={(e) => handleAddressChange("state", e.target.value)}
                          />
                        ) : (
                          supplier.address?.state || "-"
                        )}
                      </td>
                      <td className="px-3 py-2 align-top text-gray-700">
                        {editingId === supplier.id ? (
                          <input
                            type="text"
                            className="w-full rounded border border-gray-300 p-1"
                            value={editedData?.address?.zip ?? ""}
                            onChange={(e) => handleAddressChange("zip", e.target.value)}
                          />
                        ) : (
                          supplierZip || "-"
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {editingId === supplier.id ? (
                          <div className="flex justify-center gap-2">
                            <button
                              className="rounded bg-green-500 px-3 py-1 text-white transition hover:bg-green-600"
                              onClick={() => handleSave(supplier.id)}
                            >
                              Save
                            </button>
                            <button
                              className="rounded bg-gray-400 px-3 py-1 text-white transition hover:bg-gray-500"
                              onClick={handleCancel}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            className="rounded bg-blue-500 px-3 py-1 text-white transition hover:bg-blue-600"
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
              <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                <span>
                  Showing {pageStart + 1}-{Math.min(pageStart + pageSize, filteredSuppliers.length)} of{" "}
                  {filteredSuppliers.length}
                </span>
                <div className="flex gap-2">
                  <button
                    className="rounded border px-3 py-1 disabled:opacity-50"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Prev
                  </button>
                  <span>
                    Page {currentPage} / {totalPages}
                  </span>
                  <button
                    className="rounded border px-3 py-1 disabled:opacity-50"
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
    </div>
  );
};

export default SupplierEditor;
