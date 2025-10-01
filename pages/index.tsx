// pages/index.tsx
import React, { useEffect, useState } from "react";
import type { Supplier } from "../lib/types";
import { getSuppliers } from "../lib/firestore";

export default function HomePage() {
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getSuppliers();
        setSuppliers(data);
        console.log("Fetched suppliers:", data);
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? "Failed to load suppliers");
      }
    })();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Garden Planner Directory</h1>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      {suppliers === null ? (
        <p>Loading suppliers…</p>
      ) : suppliers.length ? (
        <ul>
          {suppliers.map((s) => (
            <li key={s.id}>{s.name}</li>
          ))}
        </ul>
      ) : (
        <p>No suppliers found.</p>
      )}
      <p className="mt-6 text-sm opacity-60">Baseline view (no Firestore yet)</p>
    </div>
  );
}