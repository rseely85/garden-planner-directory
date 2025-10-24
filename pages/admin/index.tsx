// components/AdminDashboard.tsx
import React, { useState, useEffect, useRef } from "react";
import MaintenanceTools from "@/components/MaintenanceTools";
import SupplierEditor from "@/components/SupplierEditor";
import StatsSummary from "@/components/StatsSummary";
import ServiceOverview from "@/components/ServiceOverview";
import RegionOverview from "@/components/RegionOverview";
import { fetchMissingZips } from "@/lib/adminApi";

const COLLAPSIBLE_KEYS = {
  statsSummary: "collapsible_statsSummary",
  serviceOverview: "collapsible_serviceOverview",
  regionOverview: "collapsible_regionOverview",
  maintenanceTools: "collapsible_maintenanceTools",
  supplierEditor: "collapsible_supplierEditor",
};

interface AdminDashboardProps {
  stats: any;
  onRefresh: () => void;
}

const Collapsible: React.FC<{ title: string; defaultOpen?: boolean; persistKey?: string }> = ({ title, defaultOpen = false, persistKey, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    if (persistKey) {
      const stored = localStorage.getItem(persistKey);
      if (stored !== null) {
        setTimeout(() => setIsOpen(stored === "true"), 0);
      }
    }
  }, [persistKey]);

  useEffect(() => {
    if (persistKey) {
      localStorage.setItem(persistKey, isOpen.toString());
    }
  }, [isOpen, persistKey]);

  return (
    <div className="bg-white rounded shadow p-4 mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left flex justify-between items-center font-semibold text-lg mb-2 focus:outline-none"
      >
        {title}
        <span className="ml-2">{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && <div>{children}</div>}
    </div>
  );
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ stats, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [statsData, setStats] = useState<any>(stats);
  const [expandAll, setExpandAll] = useState<boolean | null>(null);
  const [renderKey, setRenderKey] = useState(0);
  const supplierEditorRef = useRef<HTMLDivElement | null>(null);
  const [filterIds, setFilterIds] = useState<string[] | null>(null);

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

  // Load expandAll state from localStorage on mount
  useEffect(() => {
    const storedExpandAll = localStorage.getItem("collapsible_expandAll");
    if (storedExpandAll !== null) {
      setExpandAll(storedExpandAll === "true");
      // Set all collapsibles to that state
      Object.values(COLLAPSIBLE_KEYS).forEach((key) => {
        localStorage.setItem(key, storedExpandAll);
      });
    }
  }, []);

  // Handler for Expand/Collapse All toggle
  const handleExpandCollapseAll = () => {
    const newState = !(expandAll === true);
    setExpandAll(newState);
    localStorage.setItem("collapsible_expandAll", newState.toString());
    Object.values(COLLAPSIBLE_KEYS).forEach((key) => {
      localStorage.setItem(key, newState.toString());
    });
    setRenderKey((prev) => prev + 1);
  };

  const handleCardClick = async (type: string, payloadIds?: string[]) => {
    if (type !== "missingZips") {
      setFilterIds(null);
      return;
    }

    try {
      let ids: string[] = Array.isArray(payloadIds) ? payloadIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0) : [];

      if (ids.length === 0) {
        const result = await fetchMissingZips();
        ids = Array.isArray(result.ids) ? result.ids : [];
      }

      console.log("🧩 Missing ZIP supplier IDs:", ids);

      if (ids.length === 0) {
        alert("✅ No suppliers found with missing ZIP codes.");
        setFilterIds([]);
        return;
      }

      setFilterIds(ids);
      console.log("🔄 Applying Missing ZIP filter in SupplierEditor...");

      setTimeout(() => {
        localStorage.setItem(COLLAPSIBLE_KEYS.supplierEditor, "true");
        setRenderKey((prev) => prev + 1);
        supplierEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    } catch (error) {
      console.error("❌ Failed to load missing ZIPs:", error);
      alert("Failed to fetch missing ZIPs — check the API or Firestore connection.");
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <div className="mb-6 flex space-x-4">
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Refresh
        </button>
        <button
          onClick={handleExpandCollapseAll}
          className="px-4 py-2 bg-gray-600 text-white rounded"
          aria-pressed={expandAll === true}
        >
          {expandAll === true ? "Collapse All" : "Expand All"}
        </button>
      </div>
      <Collapsible key={`statsSummary-${renderKey}`} title="📊 Stats Summary" defaultOpen persistKey={COLLAPSIBLE_KEYS.statsSummary}>
        <StatsSummary stats={statsData} onCardClick={handleCardClick} />
      </Collapsible>
      <Collapsible key={`serviceOverview-${renderKey}`} title="🧭 Service Overview" persistKey={COLLAPSIBLE_KEYS.serviceOverview}>
        <ServiceOverview stats={statsData} />
      </Collapsible>
      <Collapsible key={`regionOverview-${renderKey}`} title="🗺️ Region Overview" persistKey="collapsible_regionOverview">
        <RegionOverview />
      </Collapsible>
      <Collapsible key={`maintenanceTools-${renderKey}`} title="🧰 Maintenance Tools" persistKey={COLLAPSIBLE_KEYS.maintenanceTools}>
        <MaintenanceTools />
      </Collapsible>
      <div ref={supplierEditorRef}>
        <Collapsible key={`supplierEditor-${renderKey}`} title="🧾 Supplier Editor" persistKey={COLLAPSIBLE_KEYS.supplierEditor}>
          <SupplierEditor key={filterIds?.join(",") || "all"} filterIds={filterIds ?? undefined} />
        </Collapsible>
      </div>
    </div>
  );
};

export default AdminDashboard;
