// components/AdminDashboard.tsx
import React, { useState, useEffect } from "react";
import MaintenanceTools from "@/components/MaintenanceTools";
import SupplierEditor from "@/components/SupplierEditor";
import StatsSummary from "@/components/StatsSummary";
import ServiceOverview from "@/components/ServiceOverview";

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
        setIsOpen(stored === "true");
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

  const collapsibleKeys = {
    statsSummary: "collapsible_statsSummary",
    serviceOverview: "collapsible_serviceOverview",
    maintenanceTools: "collapsible_maintenanceTools",
    supplierEditor: "collapsible_supplierEditor",
  };

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
      Object.values(collapsibleKeys).forEach((key) => {
        localStorage.setItem(key, storedExpandAll);
      });
    }
  }, []);

  // Handler for Expand/Collapse All toggle
  const handleExpandCollapseAll = () => {
    const newState = !(expandAll === true);
    setExpandAll(newState);
    localStorage.setItem("collapsible_expandAll", newState.toString());
    Object.values(collapsibleKeys).forEach((key) => {
      localStorage.setItem(key, newState.toString());
    });
    setRenderKey((prev) => prev + 1);
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
      <Collapsible key={`statsSummary-${renderKey}`} title="📊 Stats Summary" defaultOpen persistKey={collapsibleKeys.statsSummary}>
        <StatsSummary stats={statsData} />
      </Collapsible>
      <Collapsible key={`serviceOverview-${renderKey}`} title="🧭 Service Overview" persistKey={collapsibleKeys.serviceOverview}>
        <ServiceOverview stats={statsData} />
      </Collapsible>
      <Collapsible key={`maintenanceTools-${renderKey}`} title="🧰 Maintenance Tools" persistKey={collapsibleKeys.maintenanceTools}>
        <MaintenanceTools />
      </Collapsible>
      <Collapsible key={`supplierEditor-${renderKey}`} title="🧾 Supplier Editor" persistKey={collapsibleKeys.supplierEditor}>
        <SupplierEditor />
      </Collapsible>
    </div>
  );
};

export default AdminDashboard;