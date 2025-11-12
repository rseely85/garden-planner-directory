import React from "react";
import Link from "next/link";
import type { GetServerSideProps } from "next";
import ReviewList from "../../components/ReviewList";
import ReviewForm from "../../components/ReviewForm";
import { getSupplierBySlug } from "../../lib/firestore";
import type { Supplier } from "../../lib/types";

interface SupplierPageProps {
  supplier: Supplier | null;
}

export default function SupplierPage({ supplier }: SupplierPageProps) {
  if (!supplier) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">Supplier Not Found</h1>
        <Link href="/" className="text-blue-600 underline">
          ← Back to Directory
        </Link>
      </div>
    );
  }

  const categories = Array.isArray(supplier.categories)
    ? supplier.categories
    : supplier.category
    ? [supplier.category]
    : [];
  const services = Array.isArray(supplier.services) ? supplier.services : [];
  const products = Array.isArray(supplier.products) ? supplier.products : [];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/" className="text-blue-600 underline text-sm mb-4 inline-block">
        ← Back to Directory
      </Link>

      <div
        className={`border rounded-xl shadow-sm bg-white overflow-hidden transition duration-200 ${
          supplier.premium ? "border-yellow-400" : "border-gray-200"
        }`}
      >
        {/* Header image */}
        <div className="h-56 w-full bg-gray-100 flex items-center justify-center">
          <img
            src={supplier.logo || "https://placehold.co/400x200?text=No+Image"}
            alt={supplier.name}
            className="object-cover h-full w-full"
          />
        </div>

        {/* Details */}
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{supplier.name}</h1>

          <div className="flex flex-wrap gap-2 mb-4">
            {supplier.premium && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                ⭐ Premium
              </span>
            )}
            {supplier.verified && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-sm">
                ✅ Verified
              </span>
            )}
          </div>

          <p className="text-gray-700 mb-2">
            <strong>Categories:</strong> {categories.length > 0 ? categories.join(", ") : "N/A"}
          </p>

          {services.length > 0 && (
            <p className="text-gray-700 mb-2">
              <strong>Services:</strong> {services.join(", ")}
            </p>
          )}

          {products.length > 0 && (
            <p className="text-gray-700 mb-2">
              <strong>Products:</strong> {products.join(", ")}
            </p>
          )}

          <p className="text-gray-700 mb-2">
            <strong>Location:</strong>{" "}
            {supplier.address?.city && supplier.address?.state
              ? `${supplier.address.city}, ${supplier.address.state}`
              : "N/A"}
          </p>

          <p className="text-gray-700 mb-2">
            <strong>Website:</strong>{" "}
            {supplier.website ? (
              <a
                href={supplier.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {supplier.website}
              </a>
            ) : (
              "Website N/A"
            )}
          </p>
        </div>
      </div>

      {/* Reviews */}
      <div className="mt-8">
        <ReviewList />
        <ReviewForm />
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<SupplierPageProps> = async ({ params }) => {
  const slug = typeof params?.slug === "string" ? params.slug : Array.isArray(params?.slug) ? params.slug[0] : undefined;
  const supplier = slug ? await getSupplierBySlug(slug) : null;

  return {
    props: {
      supplier: supplier ? JSON.parse(JSON.stringify(supplier)) : null,
    },
  };
};
