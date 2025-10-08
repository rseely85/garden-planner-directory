// pages/index.tsx
import React, { useState, useMemo } from "react";
import SupplierCard from "../components/SupplierCard";
import FilterBar from "../components/FilterBar";
import type { Supplier } from "../lib/types";
import { getSuppliers } from "../lib/firestore";

export default function Home({ suppliers }: { suppliers: Supplier[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Extract unique categories for dropdown
  const categories = useMemo(() => {
    const allCategories = suppliers.map((s) => s.category).filter(Boolean);
    return Array.from(new Set(allCategories));
  }, [suppliers]);

  // Filter suppliers based on search and category
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const matchesCategory =
        !selectedCategory || s.category === selectedCategory;
      const search = searchQuery.toLowerCase();
      const matchesSearch =
        s.name.toLowerCase().includes(search) ||
        s.products?.some((p) => p.toLowerCase().includes(search)) ||
        s.services?.some((sv) => sv.toLowerCase().includes(search));
      return matchesCategory && matchesSearch;
    });
  }, [suppliers, searchQuery, selectedCategory]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Garden Planner Directory</h1>

      {/* Filter Bar */}
      <FilterBar
        categories={categories}
        onSearchChange={setSearchQuery}
        onCategoryChange={setSelectedCategory}
      />

      {/* Supplier Grid */}
      {filteredSuppliers.length ? (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {filteredSuppliers.map((supplier) => (
            <SupplierCard key={supplier.id} supplier={supplier} />
          ))}
        </div>
      ) : (
        <p className="text-gray-600 mt-6">No suppliers match your criteria.</p>
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