// components/MaintenanceTools.tsx
import React, { useState } from "react";
import Link from "next/link";

interface ActionResponse {
  success: boolean;
  message: string;
}

interface LogEntry {
  timestamp: string;
  action: string;
  message: string;
  status: "success" | "warning" | "error";
}

const MaintenanceTools: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLog, setShowLog] = useState<boolean>(false);

  const handleAction = async (endpoint: string, label: string) => {
    setLoading(label);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/${endpoint}`);
      const data: ActionResponse = await response.json();

      if (data.success) {
        const successMessage = `✅ ${label} completed successfully: ${data.message || "OK"}`;
        setMessage(successMessage);
        setLogs(prev => [
          ...prev,
          {
            timestamp: new Date().toLocaleString(),
            action: label,
            message: data.message || "OK",
            status: "success",
          },
        ]);
      } else {
        const warningMessage = `⚠️ ${label} failed: ${data.message || "Unknown error"}`;
        setMessage(warningMessage);
        setLogs(prev => [
          ...prev,
          {
            timestamp: new Date().toLocaleString(),
            action: label,
            message: data.message || "Unknown error",
            status: "warning",
          },
        ]);
      }
    } catch (err: any) {
      const errorMessage = `❌ ${label} error: ${err.message}`;
      setMessage(errorMessage);
      setLogs(prev => [
        ...prev,
        {
          timestamp: new Date().toLocaleString(),
          action: label,
          message: err.message,
          status: "error",
        },
      ]);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-6 bg-gray-50 rounded-lg shadow mb-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">
        Maintenance Tools
      </h2>

      <div className="flex flex-wrap gap-4 mb-4">
        <button
          onClick={() => handleAction("stats", "Regenerate Stats")}
          disabled={loading !== null}
          className={`px-4 py-2 rounded text-white ${
            loading === "Regenerate Stats" ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading === "Regenerate Stats" ? "Running..." : "🔁 Regenerate Stats"}
        </button>
        <Link
          href="/admin/validation-report"
          className="px-4 py-2 rounded bg-teal-600 hover:bg-teal-700 text-white flex items-center"
        >
          📋 Validation Report
        </Link>

        <button
          onClick={() => handleAction("verify", "Verify Supplier Data")}
          disabled={loading !== null}
          className={`px-4 py-2 rounded text-white ${
            loading === "Verify Supplier Data" ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {loading === "Verify Supplier Data" ? "Running..." : "🧹 Verify Supplier Data"}
        </button>

        <button
          onClick={() => handleAction("backfill", "Backfill Missing Locations")}
          disabled={loading !== null}
          className={`px-4 py-2 rounded text-white ${
            loading === "Backfill Missing Locations" ? "bg-gray-400" : "bg-purple-600 hover:bg-purple-700"
          }`}
        >
          {loading === "Backfill Missing Locations" ? "Running..." : "🗺️ Backfill Missing Locations"}
        </button>
      </div>

      {message && (
        <div
          className={`p-3 rounded text-sm ${
            message.startsWith("✅")
              ? "bg-green-100 text-green-800"
              : message.startsWith("⚠️")
              ? "bg-yellow-100 text-yellow-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {message}
        </div>
      )}

      <div className="mt-4">
        <button
          onClick={() => setShowLog(prev => !prev)}
          className="mb-2 px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
        >
          {showLog ? "Hide Log" : "Show Log"}
        </button>
        {showLog && (
          <div className="border border-gray-300 rounded max-h-64 overflow-y-auto bg-white">
            {logs.length === 0 ? (
              <div className="p-3 text-gray-500 text-sm">No log entries yet.</div>
            ) : (
              logs
                .slice(-10)
                .slice()
                .reverse()
                .map((log, index) => (
                  <div
                    key={index}
                    className={`p-2 border-b last:border-b-0 text-sm ${
                      log.status === "success"
                        ? "bg-green-50 text-green-800 border-green-200"
                        : log.status === "warning"
                        ? "bg-yellow-50 text-yellow-800 border-yellow-200"
                        : "bg-red-50 text-red-800 border-red-200"
                    }`}
                  >
                    <div className="font-semibold">{log.action}</div>
                    <div>{log.message}</div>
                    <div className="text-xs text-gray-500">{log.timestamp}</div>
                  </div>
                ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenanceTools;
