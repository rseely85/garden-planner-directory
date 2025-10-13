// components/AdminDashboard.tsx
import React, { useCallback } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["#22c55e", "#16a34a", "#15803d", "#65a30d", "#4d7c0f"];

interface SupplierStats {
  total: number;
  byCategory: Record<string, number>;
  verified: number;
  premium: number;
  updatedRange: { earliest: string; latest: string };
}

interface AdminDashboardProps {
  stats: SupplierStats | null;
  onRefresh: () => void;
}

export default function AdminDashboard({ stats, onRefresh }: AdminDashboardProps) {
  const fileName = `supplier-stats_${new Date().toISOString().slice(0,10)}.csv`;

  const handleExportCSV = useCallback(async () => {
    try {
      const res = await fetch("/api/export/csv");
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV export error", err);
      alert("Sorry, export failed. Check server logs.");
    }
  }, [fileName]);

  const handleCopyJSON = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(stats ?? {}, null, 2));
      alert("Stats JSON copied to clipboard");
    } catch (e) {
      console.error(e);
      alert("Copy failed");
    }
  }, [stats]);
  const categoryData = Object.entries(stats?.byCategory || {}).map(
    ([name, value]) => ({ name, value })
  );

  const donutData = [
    { name: "Verified", value: stats?.verified || 0 },
    { name: "Premium", value: stats?.premium || 0 },
    { name: "Other", value: (stats?.total || 0) - (stats?.verified || 0) },
  ];

  if (!stats) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No stats available.</p>
        <button
          onClick={onRefresh}
          className="mt-4 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
        >
          Load Stats
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-green-800">Admin Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700"
          >
            Export CSV
          </button>
          <button
            onClick={handleCopyJSON}
            className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800"
          >
            Copy Stats JSON
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 shadow rounded-lg">
          <h2 className="text-gray-500 text-sm uppercase">Total Suppliers</h2>
          <p className="text-2xl font-semibold text-green-700">{stats.total}</p>
        </div>

        <div className="bg-white p-4 shadow rounded-lg">
          <h2 className="text-gray-500 text-sm uppercase">Verified</h2>
          <p className="text-2xl font-semibold text-green-700">
            {stats.verified} / {stats.total}
          </p>
        </div>

        <div className="bg-white p-4 shadow rounded-lg">
          <h2 className="text-gray-500 text-sm uppercase">Premium Accounts</h2>
          <p className="text-2xl font-semibold text-green-700">{stats.premium}</p>
        </div>
      </div>

      <div className="bg-white p-4 shadow rounded-lg">
        <h2 className="text-gray-500 text-sm uppercase mb-2">By Category</h2>
        <ul className="space-y-1">
          {Object.entries(stats.byCategory).map(([category, count]) => (
            <li key={category} className="flex justify-between text-gray-700">
              <span>{category}</span>
              <span>{count}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white p-4 shadow rounded-lg">
        <h2 className="text-gray-500 text-sm uppercase mb-1">Last Updated Range</h2>
        <p className="text-gray-700">
          {stats.updatedRange.earliest} → {stats.updatedRange.latest}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 shadow rounded-lg">
          <h2 className="text-gray-500 text-sm uppercase mb-2">
            Category Distribution
          </h2>
          <div className="w-full h-64">
            <ResponsiveContainer>
              <BarChart data={categoryData}>
                <XAxis dataKey="name" stroke="#888" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 shadow rounded-lg">
          <h2 className="text-gray-500 text-sm uppercase mb-2">
            Verified / Premium Split
          </h2>
          <div className="w-full h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#22c55e"
                  dataKey="value"
                  label
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}