import React from 'react';
import { useRouter } from 'next/router';
import SupplierCard from '../../../components/SupplierCard';
import { getSuppliersByFilters } from '../../../lib/firestore';

export default function DirectoryPage() {
  const router = useRouter();
  const { city, category } = router.query;

  // TODO: fetch suppliers with getSuppliersByFilters(city, category)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Directory</h1>
      <p className="text-gray-600">TODO: List suppliers for {city} - {category}</p>
      {/* TODO: Render SupplierCard list */}
    </div>
  );
}
