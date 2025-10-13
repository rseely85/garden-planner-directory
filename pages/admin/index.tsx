// pages/admin/index.tsx
import React, { useState, useEffect } from "react";
import AdminDashboard from "../../components/AdminDashboard";
import { getSupplierStats } from "../../lib/getSupplierStats";

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    const data = await getSupplierStats();
    setStats(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (process.env.NODE_ENV !== "development") {
    return (
      <div className="p-6 text-center text-gray-600">
        <h1 className="text-xl font-semibold mb-2">Access Restricted</h1>
        <p>This page is only available in development mode.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {loading ? (
        <div className="text-center p-10 text-gray-500">Loading stats...</div>
      ) : (
        <AdminDashboard stats={stats} onRefresh={fetchStats} />
      )}
    </div>
  );
}