// components/AdminDashboard.tsx
import React, { useState, useEffect, useRef } from "react";
import AdminMaintenancePanel from "@/components/AdminMaintenancePanel";
import SupplierEditor from "@/components/SupplierEditor";
import { fetchMissingZips } from "@/lib/adminApi";

interface AdminDashboardProps {
  stats: any;
  onRefresh: () => void;
}

const StatBadge: React.FC<{ label: string; value: number; tone: "green" | "yellow" | "purple" }> = ({
  label,
  value,
  tone,
}) => {
  const containerTone =
    tone === "green"
      ? "bg-emerald-600"
      : tone === "yellow"
      ? "bg-amber-500"
      : "bg-violet-600";
  return (
    <div className={`flex items-center gap-2 rounded-full px-4 py-1 text-sm font-semibold text-white ${containerTone}`}>
      <span className="h-2 w-2 rounded-full bg-white" />
      <span>{label}</span>
      <span className="ml-1 rounded bg-white/20 px-2 py-0.5 text-xs font-bold">{value}</span>
    </div>
  );
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ stats, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [statsData, setStats] = useState<any>(stats);
  const supplierEditorRef = useRef<HTMLDivElement | null>(null);
  const [filterIds, setFilterIds] = useState<string[] | null>(null);
  const [missingZipCount, setMissingZipCount] = useState<number>(stats?.missingZips ?? 0);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/stats");
      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }
      const result = await response.json();
      if (result && result.success && result.data) {
        setStats(result.data);
      } else if (result && result.success) {
        setStats(result);
      } else {
        console.error("Unexpected response format:", result);
        setStats(null);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const loadMissingZipCount = async () => {
      try {
        const result = await fetchMissingZips();
        const ids = Array.isArray(result.ids)
          ? result.ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
          : [];
        setMissingZipCount(ids.length);
      } catch (error) {
        console.error("❌ Failed to load missing ZIP count:", error);
      }
    };
    void loadMissingZipCount();
  }, []);

  const applyMissingZipFilter = async () => {
    try {
      const result = await fetchMissingZips();
      const ids = Array.isArray(result.ids)
        ? result.ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        : [];
      console.log("🧩 Missing ZIP supplier IDs:", ids);

      if (ids.length === 0) {
        alert("✅ No suppliers found with missing ZIP codes.");
        setFilterIds([]);
        return;
      }

      setFilterIds(ids);
      console.log("🔄 Applying Missing ZIP filter in SupplierEditor...");

      setTimeout(() => {
        supplierEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      setMissingZipCount(ids.length);
    } catch (error) {
      console.error("❌ Failed to load missing ZIPs:", error);
      alert("Failed to fetch missing ZIPs — check the API or Firestore connection.");
    }
  };

  const handleMissingZipResolved = async () => {
    try {
      const result = await fetchMissingZips();
      const ids = Array.isArray(result.ids) ? result.ids : [];
      setFilterIds(ids);
      setMissingZipCount(ids.length);
      if (ids.length === 0) {
        supplierEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch (error) {
      console.error("❌ Failed to refresh missing ZIPs:", error);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-10 text-gray-500">
        Loading stats...
      </div>
    );
  }

  if (!statsData || Object.keys(statsData).length === 0) {
    return (
      <div className="text-center p-10 text-gray-500">
        Preparing data...
      </div>
    );
  }

  const totalSuppliers = statsData?.totalSuppliers ?? 0;
  const verifiedCount = statsData?.verifiedCount ?? 0;
  const premiumCount = statsData?.premiumCount ?? 0;
  const unverifiedCount = statsData?.unverifiedCount ?? Math.max(totalSuppliers - verifiedCount, 0);
  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">Monitor stats, maintain master data, and update suppliers.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              fetchStats();
              setFilterIds(null);
              supplierEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              if (typeof onRefresh === "function") {
                onRefresh();
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Refresh
          </button>
        </div>
      </header>

      <section aria-label="Dashboard stats" className="rounded-lg border border-gray-200 bg-white p-4 shadow">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold uppercase tracking-wide text-gray-500">Stat Summary</span>
          <StatBadge label="Verified" value={verifiedCount} tone="green" />
          <StatBadge label="Unverified" value={unverifiedCount} tone="yellow" />
          <StatBadge label="Premium" value={premiumCount} tone="purple" />
          <button
            type="button"
            onClick={applyMissingZipFilter}
            className="ml-auto rounded border border-blue-500 px-3 py-1.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
          >
            Missing ZIPs ({missingZipCount})
          </button>
        </div>
      </section>

      <section ref={supplierEditorRef} aria-label="Supplier editor" className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-4 text-xl font-semibold text-gray-800">Supplier Editor</h2>
        <SupplierEditor
          key={filterIds?.join(",") || "all"}
          filterIds={filterIds ?? undefined}
          onMissingZipResolved={handleMissingZipResolved}
          pageSize={5}
        />
      </section>

      <section aria-label="Database maintenance" className="rounded-lg bg-white p-4 shadow">
        <AdminMaintenancePanel />
      </section>
    </div>
  );
};

export default AdminDashboard;
