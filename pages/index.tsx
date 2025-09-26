import React, { useEffect, useState } from 'react';
import SupplierCard from '../components/SupplierCard';
import PlannerSidebarMatches from '../components/PlannerSidebarMatches';
import { getSuppliers } from '../lib/firestore';
import { Supplier } from '../lib/types';

export default function HomePage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    async function fetchSuppliers() {
      try {
        const suppliers = await getSuppliers();
        setSuppliers(suppliers);
        console.log('Fetched suppliers:', suppliers);
      } catch (error) {
        console.error('Error fetching suppliers:', error);
      }
    }
    fetchSuppliers();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Garden Planner Directory</h1>
      {suppliers.length > 0 ? (
        suppliers.map((supplier) => (
          <SupplierCard key={supplier.id} supplier={supplier} />
        ))
      ) : (
        <p>Loading suppliers...</p>
      )}
    </div>
  );
}
