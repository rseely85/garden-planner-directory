import React, { useEffect, useState } from "react";

const ServiceOverview: React.FC = () => {
  const [services, setServices] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/serviceOverview");
      if (!response.ok) throw new Error("Failed to fetch service data");
      const data = await response.json();

      setServices(data.services || []);

      // Handle regions: deduplicate and sort alphabetically
      let regionList: string[] = data.regions || [];
      regionList = Array.from(new Set(regionList));
      regionList.sort((a, b) => a.localeCompare(b));
      setRegions(regionList);
    } catch (err: any) {
      console.error("Error fetching service overview:", err);
      setError("Error loading data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Group regions by state and count occurrences
  // Assuming regions are strings possibly containing state info separated by comma or similar
  // For this example, we'll assume regions are formatted as "City, State" or just "State"
  // We'll group by the last part after comma or the whole string if no comma
  const groupedRegions = regions.reduce<Record<string, number>>((acc, region) => {
    const parts = region.split(",").map((p) => p.trim());
    const state = parts.length > 1 ? parts[parts.length - 1] : region;
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {});

  if (loading) return <div className="text-gray-500 text-sm">Loading service data...</div>;
  if (error) return <div className="text-red-500 text-sm">{error}</div>;

  return (
    <div className="space-y-6">
      {/* Services */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Services Offered</h3>
          <button
            onClick={fetchData}
            className="text-gray-500 text-sm hover:text-gray-700 flex items-center gap-1"
            aria-label="Refresh Services and Regions Data"
            type="button"
          >
            🔄 Refresh Data
          </button>
        </div>
        {services.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {services.map((service, index) => (
              <span
                key={index}
                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
              >
                {service}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No services listed.</p>
        )}
      </div>

      {/* Regions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Regions Covered</h3>
          <button
            onClick={fetchData}
            className="text-gray-500 text-sm hover:text-gray-700 flex items-center gap-1"
            aria-label="Refresh Services and Regions Data"
            type="button"
          >
            🔄 Refresh Data
          </button>
        </div>
        {regions.length > 0 ? (
          <div className="flex flex-col gap-1">
            {Object.entries(groupedRegions).map(([state, count]) => (
              <div key={state} className="flex items-center gap-2">
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                  {state}
                </span>
                {count > 1 && (
                  <span className="text-green-600 text-xs font-medium">({count})</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            Regions data not available — please verify supplier location info
          </p>
        )}
      </div>
    </div>
  );
};

export default ServiceOverview;