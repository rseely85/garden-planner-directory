import React, { useEffect, useState } from "react";
import Link from "next/link";

type ValidationResult = {
  supplierName: string;
  missingFields: string[];
  city: string;
  verified: boolean;
};

const ValidationReport: React.FC = () => {
  const [data, setData] = useState<ValidationResult[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/validation");
      if (!res.ok) {
        throw new Error(`Error: ${res.status} ${res.statusText}`);
      }
      const json = await res.json();
      if (Array.isArray(json)) {
        setData(json);
      } else if (Array.isArray(json.incompleteSuppliers)) {
        setData(json.incompleteSuppliers);
      } else {
        throw new Error("Invalid response format from API");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch data.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
          <h1 className="text-2xl font-bold text-gray-800">Supplier Validation Report</h1>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
              onClick={fetchData}
              disabled={loading}
            >
              Refresh Data
            </button>
            <Link href="/admin" className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition">
              Back to Dashboard
            </Link>
          </div>
        </div>
        <div className="bg-white rounded shadow p-4">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading validation results...</div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">Error: {error}</div>
          ) : !data || data.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No validation results found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Supplier Name</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Missing Fields</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">City</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Verified</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {data.map((result, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-2">{result.supplierName || <span className="text-gray-400 italic">Unknown</span>}</td>
                      <td className="px-4 py-2">
                        {result.missingFields && result.missingFields.length > 0
                          ? result.missingFields.join(", ")
                          : <span className="text-green-600">None</span>
                        }
                      </td>
                      <td className="px-4 py-2">{result.city || <span className="text-gray-400 italic">N/A</span>}</td>
                      <td className="px-4 py-2">
                        {result.verified ? (
                          <span className="inline-block px-2 py-1 text-xs rounded bg-green-100 text-green-700">Yes</span>
                        ) : (
                          <span className="inline-block px-2 py-1 text-xs rounded bg-red-100 text-red-700">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ValidationReport;