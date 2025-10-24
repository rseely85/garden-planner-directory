import React, { useEffect, useState } from "react";
import { Users, CheckCircle, XCircle, Star, Map, AlertTriangle } from "lucide-react";

type StatsKey = "total" | "verified" | "unverified" | "premium" | "activeRegions" | "missingZips";

interface StatsSummaryProps {
  stats: {
    totalSuppliers?: number;
    verifiedCount?: number;
    unverifiedCount?: number;
    premiumCount?: number;
    activeRegions?: number;
    missingZips?: number;
  };
  onCardClick?: (key: StatsKey, payload?: string[]) => void;
}

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; color: string }> = ({
  title,
  value,
  icon,
  color,
}) => {
  return (
    <div
      className={`flex flex-col items-start justify-between p-2 rounded-lg shadow-md ${color} text-white transition-transform transform hover:scale-[1.01]`}
    >
      <div className="flex items-center mb-1 space-x-1">
        {icon}
        <h3 className="text-xs font-semibold">{title}</h3>
      </div>
      <div className="text-xl font-bold">{value ?? 0}</div>
    </div>
  );
};

const StatsSummary: React.FC<StatsSummaryProps> = ({ stats, onCardClick }) => {
  const [missingZipCount, setMissingZipCount] = useState<number | null>(null);
  const [missingZipIds, setMissingZipIds] = useState<string[] | null>(null);

  useEffect(() => {
    const fetchMissingZips = async () => {
      try {
        const response = await fetch("/api/admin/missingZips");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setMissingZipCount(data.count ?? 0);
        if (Array.isArray(data.ids)) {
          setMissingZipIds(data.ids);
        } else {
          setMissingZipIds(null);
        }
      } catch (error) {
        console.error("Failed to fetch missing ZIPs count:", error);
      }
    };
    fetchMissingZips();
  }, []);

  const totalSuppliers = stats?.totalSuppliers ?? 0;
  const verifiedCount = stats?.verifiedCount ?? 0;
  const unverifiedCount = stats?.unverifiedCount ?? totalSuppliers - verifiedCount;
  const premiumCount = stats?.premiumCount ?? 0;
  const activeRegions = stats?.activeRegions ?? 0;
  const missingZips = missingZipCount !== null ? missingZipCount : (stats?.missingZips ?? 0);

  const summaryData: Array<{ key: StatsKey; title: string; value: number; icon: React.ReactNode; color: string }> = [
    { key: "total", title: "Total Suppliers", value: totalSuppliers, icon: <Users className="w-3 h-3" />, color: "bg-blue-500" },
    { key: "verified", title: "Verified", value: verifiedCount, icon: <CheckCircle className="w-3 h-3" />, color: "bg-green-500" },
    { key: "unverified", title: "Unverified", value: unverifiedCount, icon: <XCircle className="w-3 h-3" />, color: "bg-yellow-500" },
    { key: "premium", title: "Premium", value: premiumCount, icon: <Star className="w-3 h-3" />, color: "bg-purple-500" },
    { key: "activeRegions", title: "Active Regions", value: activeRegions, icon: <Map className="w-3 h-3" />, color: "bg-cyan-500" },
    { key: "missingZips", title: "Missing ZIPs", value: missingZips, icon: <AlertTriangle className="w-3 h-3" />, color: "bg-red-500" },
  ];

  const handleCardClick = (key: StatsKey) => {
    if (!onCardClick) return;
    if (key === "missingZips") {
      onCardClick(key, missingZipIds ?? []);
    } else {
      onCardClick(key);
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1">
      {summaryData.map((item) => (
        <div
          key={item.key}
          role={onCardClick ? "button" : undefined}
          onClick={() => handleCardClick(item.key)}
          className={`cursor-${onCardClick ? "pointer" : "default"}`}
        >
          <StatCard title={item.title} value={item.value} icon={item.icon} color={item.color} />
        </div>
      ))}
    </div>
  );
};

export default StatsSummary;
