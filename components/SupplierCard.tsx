import React from 'react';
import { Supplier } from '../lib/types';

export default function SupplierCard({ supplier }: { supplier: Supplier }) {
  return (
    <div className="border p-4 rounded bg-white shadow-sm">
      <h2 className="text-xl font-semibold">{supplier.name}</h2>
      <p className="text-gray-500">{supplier.category}</p>
      {supplier.website && (
        <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          {supplier.website}
        </a>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {supplier.services.map((service, index) => (
          <span key={index} className="bg-gray-200 text-xs px-2 py-1 rounded">
            {service}
          </span>
        ))}
      </div>
    </div>
  );
}
