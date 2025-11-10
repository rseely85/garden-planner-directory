import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ValidationEntry } from "@/lib/types";

interface OptionItem {
  id: string;
  label: string;
}

interface ValidationResponse {
  status: string;
  totalSuppliers: number;
  invalidCount: number;
  validCount: number;
  filteredCount: number;
  categories: OptionItem[];
  regions: OptionItem[];
  filters: {
    valid: string;
    category: string;
    region: string;
    search: string;
  };
  sort: {
    key: string | null;
    direction: "asc" | "desc";
  };
  incompleteSuppliers: ValidationEntry[];
}

type ValidityFilter = "all" | "valid" | "invalid";
type SortKey = "name" | "slug" | "regionLabel" | "lastUpdated" | "categoryLabel" | "address";

const PAGE_SIZE = 10;

const defaultFilters = {
  validity: "invalid" as ValidityFilter,
  category: "",
  region: "",
  search: "",
};

const ValidationReport: React.FC = () => {
  const [report, setReport] = useState<ValidationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [filters, setFilters] = useState(defaultFilters);
  const [draftFilters, setDraftFilters] = useState(defaultFilters);
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "name", direction: "asc" });

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.validity === "valid") params.set("valid", "true");
    if (filters.validity === "invalid") params.set("valid", "false");
    if (filters.category) params.set("category", filters.category);
    if (filters.region) params.set("region", filters.region);
    if (filters.search) params.set("search", filters.search);
    if (sort.key) params.set("sort", sort.key);
    params.set("direction", sort.direction);
    return params.toString();
  }, [filters, sort]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildQueryString();
      const res = await fetch(`/api/admin/validation?${qs}`);
      if (!res.ok) {
        throw new Error(`Validation API error: ${res.status} ${res.statusText}`);
      }
      const json: ValidationResponse = await res.json();
      if (!json || !Array.isArray(json.incompleteSuppliers)) {
        throw new Error("Invalid validation response format.");
      }

      setReport(json);
      setPage(1);

      console.log("📊 Validation report refreshed", { filters, count: json.filteredCount });
      if (json.filteredCount === 0) {
        console.warn("⚠️ No matching suppliers for current filters.");
      }
    } catch (err: any) {
      console.error("❌ Validation report fetch failed:", err);
      setError(err.message || "Failed to load validation data.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [buildQueryString, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const paginatedEntries = useMemo(() => {
    if (!report?.incompleteSuppliers) return [];
    const start = (page - 1) * PAGE_SIZE;
    return report.incompleteSuppliers.slice(start, start + PAGE_SIZE);
  }, [report, page]);

  const totalPages = report ? Math.max(1, Math.ceil((report.filteredCount || 0) / PAGE_SIZE)) : 1;

  const csvDownloadUrl = useMemo(() => {
    const qs = buildQueryString();
    return `/api/admin/validation?format=csv&${qs}`;
  }, [buildQueryString]);

  const handleApplyFilters = () => {
    setFilters(draftFilters);
  };

  const handleClearFilters = () => {
    setDraftFilters(defaultFilters);
    setFilters(defaultFilters);
  };

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const handleSort = (key: SortKey) => {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const renderSortIndicator = (key: SortKey) => {
    if (sort.key !== key) return <span className="ml-1 text-gray-400">⇅</span>;
    return sort.direction === "asc" ? (
      <span className="ml-1 text-gray-600">▲</span>
    ) : (
      <span className="ml-1 text-gray-600">▼</span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Supplier Validation Report</h1>
          <div className="flex flex-wrap gap-2">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
              onClick={fetchData}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh Data"}
            </button>
            <button
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition"
              onClick={() => window.open(csvDownloadUrl, "_blank")}
            >
              📄 Download CSV
            </button>
            <Link
              href="/admin"
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="bg-white rounded shadow p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Validity</label>
              <select
                value={draftFilters.validity}
                onChange={(e) => setDraftFilters((prev) => ({ ...prev, validity: e.target.value as ValidityFilter }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="all">Show All</option>
                <option value="invalid">Only Invalid</option>
                <option value="valid">Only Valid</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Category</label>
              <select
                value={draftFilters.category}
                onChange={(e) => setDraftFilters((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="">All Categories</option>
                {report?.categories?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Region</label>
              <select
                value={draftFilters.region}
                onChange={(e) => setDraftFilters((prev) => ({ ...prev, region: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="">All Addresses</option>
                {report?.regions?.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Search</label>
              <input
                value={draftFilters.search}
                onChange={(e) => setDraftFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Supplier name or slug"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
              Apply Filters
            </button>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
            >
              Clear
            </button>
          </div>
        </div>

        {report && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded border border-gray-200 bg-white p-4">
              <h2 className="text-sm uppercase tracking-wide text-gray-500">Total Suppliers</h2>
              <p className="text-2xl font-semibold text-gray-900">{report.totalSuppliers}</p>
            </div>
            <div className="rounded border border-red-200 bg-red-50 p-4">
              <h2 className="text-sm uppercase tracking-wide text-red-600">Invalid</h2>
              <p className="text-2xl font-semibold text-red-700">{report.invalidCount}</p>
            </div>
            <div className="rounded border border-green-200 bg-green-50 p-4">
              <h2 className="text-sm uppercase tracking-wide text-green-600">Valid</h2>
              <p className="text-2xl font-semibold text-green-700">{report.validCount}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded shadow">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Refreshing validation results…</div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">Error: {error}</div>
          ) : !report || report.filteredCount === 0 ? (
            <div className="text-center py-12 text-gray-500">No suppliers match your filters.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  {(["name", "slug", "category", "missingFields", "address", "lastUpdated", "verified"] as const).map((column) => {
                    if (column === "missingFields" || column === "verified") {
                      return (
                        <th key={column} className="px-4 py-2">
                          {column === "missingFields" ? "Missing Fields" : "Verified"}
                        </th>
                      );
                    }
                    if (column === "address") {
                      return (
                        <th key={column} className="px-4 py-2 cursor-pointer select-none" onClick={() => handleSort("address")}>
                          Address {renderSortIndicator("address")}
                        </th>
                      );
                    }
                    if (column === "category") {
                      return (
                        <th key={column} className="px-4 py-2 cursor-pointer select-none" onClick={() => handleSort("categoryLabel")}>
                          Category {renderSortIndicator("categoryLabel")}
                        </th>
                      );
                    }
                        if (column === "lastUpdated") {
                          return (
                            <th key={column} className="px-4 py-2 cursor-pointer select-none" onClick={() => handleSort("lastUpdated")}>
                              Last Updated {renderSortIndicator("lastUpdated")}
                            </th>
                          );
                        }
                        if (column === "name") {
                          return (
                            <th key={column} className="px-4 py-2 cursor-pointer select-none" onClick={() => handleSort("name")}>
                              Supplier Name {renderSortIndicator("name")}
                            </th>
                          );
                        }
                        return (
                          <th key={column} className="px-4 py-2 cursor-pointer select-none" onClick={() => handleSort("slug")}>
                            Slug {renderSortIndicator("slug")}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {paginatedEntries.map((entry) => {
                      const isInvalid = entry.missingFields.length > 0;
                      const rowClass = isInvalid ? "bg-red-50 text-red-700" : "";
                      return (
                        <tr key={entry.id} className={`hover:bg-red-100/60 ${rowClass}`}>
                          <td className="px-4 py-3 font-medium">
                            {entry.name || <span className="italic text-gray-400">Unknown</span>}
                          </td>
                          <td className="px-4 py-3 text-sm">{entry.slug}</td>
                          <td className="px-4 py-3 text-sm">{entry.categoryLabel || entry.categoryId || <span className="italic text-gray-400">N/A</span>}</td>
                          <td className="px-4 py-3 text-sm">
                            {entry.missingFields.length ? entry.missingFields.join(", ") : "None"}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {entry.address || entry.regionLabel || <span className="italic text-gray-400">N/A</span>}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {entry.lastUpdated ? new Date(entry.lastUpdated).toLocaleString() : <span className="italic text-gray-400">N/A</span>}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {entry.verified ? (
                              <span className="inline-block px-2 py-1 text-xs rounded bg-green-100 text-green-700">Yes</span>
                            ) : (
                              <span className="inline-block px-2 py-1 text-xs rounded bg-red-100 text-red-700">No</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 text-sm text-gray-600 gap-2">
                <div>
                  Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, report.filteredCount)} of {report.filteredCount} matching suppliers
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 border rounded disabled:opacity-50"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page === 1}
                  >
                    Prev
                  </button>
                  <span>Page {page} / {totalPages}</span>
                  <button
                    className="px-3 py-1 border rounded disabled:opacity-50"
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ValidationReport;
