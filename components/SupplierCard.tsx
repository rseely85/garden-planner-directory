import React from "react";
import Link from "next/link";
import { Supplier } from "../lib/types";

export default function SupplierCard({ supplier }: { supplier: Supplier }) {
  const logoUrl =
    (supplier as any)?.logo ||
    "https://placehold.co/300x200?text=No+Image";

  const website = supplier?.website || "Website N/A";
  const verified = supplier?.verified;
  const premium = supplier?.premium;

  return (
    <div
      className={`border rounded-xl shadow-sm bg-white overflow-hidden transition hover:shadow-md hover:-translate-y-0.5 duration-200 ${
        premium ? "border-yellow-400" : "border-gray-200"
      }`}
    >
      {/* Logo / Placeholder */}
      <Link href={`/supplier/${supplier.slug}`}>
        <div className="h-40 w-full bg-gray-100 flex items-center justify-center cursor-pointer">
          <img
            src={logoUrl}
            alt={supplier.name || "Supplier"}
            className="object-cover h-full w-full"
          />
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-1">
          <Link href={`/supplier/${supplier.slug}`}>
            <h2 className="text-lg font-bold text-gray-900 hover:text-blue-600 cursor-pointer">
              {supplier.name || "Unnamed Supplier"}
            </h2>
          </Link>
          <div className="flex gap-2 text-sm">
            {premium && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                ⭐ Premium
              </span>
            )}
            {verified && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                ✅ Verified
              </span>
            )}
          </div>
        </div>

        <p className="text-gray-700 text-sm">
          <strong>Category:</strong> {supplier.category || "N/A"}
        </p>

        {supplier.services?.length > 0 && (
          <p className="text-gray-600 text-sm">
            <strong>Services:</strong> {supplier.services.join(", ")}
          </p>
        )}

        {supplier.products?.length > 0 && (
          <p className="text-gray-600 text-sm">
            <strong>Products:</strong> {supplier.products.join(", ")}
          </p>
        )}

        <p className="text-gray-600 text-sm mt-1">
          <strong>Location:</strong>{" "}
          {supplier.address?.city && supplier.address?.state
            ? `${supplier.address.city}, ${supplier.address.state}`
            : "N/A"}
        </p>

        <p className="text-gray-600 text-sm mt-1">
          <strong>Website:</strong>{" "}
          {website !== "Website N/A" ? (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {website}
            </a>
          ) : (
            website
          )}
        </p>
      </div>
    </div>
  );
}
