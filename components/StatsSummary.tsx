import React from "react";
import { Users, CheckCircle, XCircle, Star } from "lucide-react";

interface StatsSummaryProps {
  stats: {
    totalSuppliers?: number;
    verifiedCount?: number;
    unverifiedCount?: number;
    premiumCount?: number;
  };
}

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; color: string }> = ({
  title,
  value,
  icon,
  color,
}) => {
  return (
    <div
      className={`flex flex-col items-start justify-between p-6 rounded-lg shadow-md ${color} text-white transition-transform transform hover:scale-[1.02]`}
    >
      <div className="flex items-center mb-3 space-x-2">
        {icon}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="text-4xl font-bold">{value ?? 0}</div>
    </div>
  );
};

const StatsSummary: React.FC<StatsSummaryProps> = ({ stats }) => {
  const totalSuppliers = stats?.totalSuppliers ?? 0;
  const verifiedCount = stats?.verifiedCount ?? 0;
  const unverifiedCount = stats?.unverifiedCount ?? totalSuppliers - verifiedCount;
  const premiumCount = stats?.premiumCount ?? 0;

  const summaryData = [
    {
      title: "Total Suppliers",
      value: totalSuppliers,
      icon: <Users className="w-6 h-6" />,
      color: "bg-blue-500",
    },
    {
      title: "Verified",
      value: verifiedCount,
      icon: <CheckCircle className="w-6 h-6" />,
      color: "bg-green-500",
    },
    {
      title: "Unverified",
      value: unverifiedCount,
      icon: <XCircle className="w-6 h-6" />,
      color: "bg-yellow-500",
    },
    {
      title: "Premium",
      value: premiumCount,
      icon: <Star className="w-6 h-6" />,
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {summaryData.map((item, index) => (
        <StatCard
          key={index}
          title={item.title}
          value={item.value}
          icon={item.icon}
          color={item.color}
        />
      ))}
    </div>
  );
};

export default StatsSummary;