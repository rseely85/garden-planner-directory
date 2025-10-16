// components/AdminDashboard.tsx
import React, { useState, useEffect } from "react";
import MaintenanceTools from "@/components/MaintenanceTools";
import SupplierEditor from "@/components/SupplierEditor";

interface AdminDashboardProps {
  stats: any;
  onRefresh: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ stats, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [statsData, setStats] = useState<any>(stats);

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
      <button
        onClick={fetchStats}
        className="mb-6 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Refresh
      </button>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(statsData).map(([key, value]) => (
          <div key={key} className="bg-white p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">{key}</h2>
            <pre>{JSON.stringify(value, null, 2)}</pre>
          </div>
        ))}
      </div>
      <MaintenanceTools />
      <div className="mt-8">
        <SupplierEditor />
      </div>
    </div>
  );
};

export default AdminDashboard;