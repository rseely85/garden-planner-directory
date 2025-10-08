// pages/index.tsx
import React from "react";
import SupplierCard from "../components/SupplierCard";
import type { Supplier } from "../lib/types";
import { getSuppliers } from "../lib/firestore";

export default function Home({ suppliers }: { suppliers: Supplier[] }) {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold">Garden Planner Directory</h1>
      {suppliers.length ? (
       <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {suppliers.map((supplier) => (
            <SupplierCard key={supplier.id} supplier={supplier} />
          ))}
        </div>
      ) : (
        <p>No suppliers found.</p>
      )}
      <p className="mt-6 text-sm opacity-60">Development branch test ✅</p>
    </div>
  );
}

export async function getServerSideProps() {
  const suppliers = await getSuppliers();
  return {
    props: {
      suppliers,
    },
  };
}