// pages/index.tsx
import React from "react";
import type { Supplier } from "../lib/types";
import { getSuppliers } from "../lib/firestore";

export default function Home({ suppliers }: { suppliers: Supplier[] }) {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Garden Planner Directory</h1>
      {suppliers.length ? (
        <ul>
          {suppliers.map((s) => (
            <li key={s.id}>{s.name}</li>
          ))}
        </ul>
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