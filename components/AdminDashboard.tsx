// components/AdminDashboard.tsx
import React, { useCallback, useState } from "react";
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

type TaskName = "verify" | "stats" | "backfill";

interface TaskResult {
  ok: boolean;
  route: string;
  message: string;
  data?: unknown;
  error?: string;
  timestamp: string;
}

export default function AdminDashboard({ stats, onRefresh }: AdminDashboardProps) {
  const fileName = `supplier-stats_${new Date().toISOString().slice(0,10)}.csv`;

  const [isRunning, setIsRunning] = useState<Record<TaskName, boolean>>({
    verify: false,
    stats: false,
    backfill: false,
  });
  const [lastResult, setLastResult] = useState<TaskResult | null>(null);

  const runTask = useCallback(async (task: TaskName) => {
    const route = `/api/admin/${task}`;
    setIsRunning((s) => ({ ...s, [task]: true }));
    try {
      const res = await fetch(route, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      const ok = res.ok && (json?.success !== false);
      const message =
        json?.message ||
        (ok ? `✅ ${task} completed successfully.` : `❌ ${task} failed.`);
      const result: TaskResult = {
        ok,
        route,
        message,
        data: json?.data,
        error: ok ? undefined : (json?.error || json?.details || `HTTP ${res.status}`),
        timestamp: new Date().toISOString(),
      };
      setLastResult(result);
      // If stats were updated, allow caller to refresh summary
      if (task === "stats" && ok) {
        onRefresh?.();
      }
    } catch (err: any) {
      const result: TaskResult = {
        ok: false,
        route,
        message: `❌ ${task} failed.`,
        error: err?.message || String(err),
        timestamp: new Date().toISOString(),
      };
      setLastResult(result);
      console.error(`[admin:${task}]`, err);
    } finally {
      setIsRunning((s) => ({ ...s, [task]: false }));
    }
  }, [onRefresh]);

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

      <div className="bg-white p-4 shadow rounded-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-gray-700 font-semibold">Maintenance Tools</h2>
          {lastResult ? (
            <span className={`text-sm ${lastResult.ok ? "text-green-700" : "text-red-700"}`}>
              {lastResult.message}
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => runTask("verify")}
            disabled={isRunning.verify}
            className={`px-3 py-2 rounded-md text-white ${isRunning.verify ? "bg-gray-400 cursor-wait" : "bg-green-600 hover:bg-green-700"}`}
          >
            {isRunning.verify ? "Verifying..." : "Run Verify"}
          </button>

          <button
            onClick={() => runTask("stats")}
            disabled={isRunning.stats}
            className={`px-3 py-2 rounded-md text-white ${isRunning.stats ? "bg-gray-400 cursor-wait" : "bg-emerald-600 hover:bg-emerald-700"}`}
          >
            {isRunning.stats ? "Generating Stats..." : "Generate Stats"}
          </button>

          <button
            onClick={() => runTask("backfill")}
            disabled={isRunning.backfill}
            className={`px-3 py-2 rounded-md text-white ${isRunning.backfill ? "bg-gray-400 cursor-wait" : "bg-teal-600 hover:bg-teal-700"}`}
          >
            {isRunning.backfill ? "Backfilling..." : "Run Backfill"}
          </button>
        </div>

        <div className="mt-4">
          <details className="group">
            <summary className="cursor-pointer select-none text-sm text-gray-600 group-open:mb-2">
              View last response
            </summary>
            <pre className="max-h-72 overflow-auto text-xs bg-gray-50 p-3 rounded border border-gray-200">
{JSON.stringify(lastResult, null, 2)}
            </pre>
          </details>
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