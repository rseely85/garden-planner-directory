import React, { useEffect, useState } from "react";

interface RegionData {
  region: string;
  supplierCount: number;
  counties: string[];
  zips: string[];
}

const RegionOverview: React.FC = () => {
  const [regions, setRegions] = useState<RegionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const res = await fetch("/api/admin/regions");
        const data = await res.json();
        if (data?.regions) {
          setRegions(data.regions);
        } else {
          setError("No region data available");
        }
      } catch (err) {
        setError("Failed to load region data");
      } finally {
        setLoading(false);
      }
    };
    fetchRegions();
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetch("/api/admin/serviceOverview");
      const res = await fetch("/api/admin/regions");
      const data = await res.json();
      if (data?.regions) {
        setRegions(data.regions);
      } else {
        setError("No region data available");
      }
    } catch (err) {
      setError("Failed to refresh region data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">Loading regions...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Region Overview</h2>
        <button
          onClick={handleRefresh}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
        >
          Refresh Data
        </button>
      </div>
      {regions.length === 0 ? (
        <p className="text-gray-500">No region data available.</p>
      ) : (
        <div className="space-y-4">
          {regions.map((region) => (
            <div
              key={region.region}
              className="border border-gray-200 rounded-lg p-4 hover:shadow transition"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-gray-800">{region.region}</h3>
                  <p className="text-sm text-gray-500">
                    {region.supplierCount} supplier
                    {region.supplierCount !== 1 ? "s" : ""}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Counties:{" "}
                    <span className="text-gray-800">
                      {region.counties.join(", ")}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() =>
                    setExpanded(expanded === region.region ? null : region.region)
                  }
                  className="text-blue-600 text-sm underline hover:text-blue-800"
                >
                  {expanded === region.region ? "Hide ZIPs" : "Show ZIPs"}
                </button>
              </div>
              {expanded === region.region && (
                <div className="mt-2 text-sm text-gray-700">
                  <p>ZIPs: {region.zips.join(", ")}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RegionOverview;