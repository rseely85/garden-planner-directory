import React from 'react';
import { Supplier } from '../lib/types';

export default function SupplierCard({ supplier }: { supplier: Supplier }) {
  return (
    <div className="border p-4 rounded bg-white shadow-sm space-y-3">
      <h2 className="text-xl font-semibold flex items-center space-x-2">
        <span>{supplier.name}</span>
        {supplier.premium && (
          <span className="bg-yellow-400 text-yellow-900 text-xs font-semibold px-2 py-0.5 rounded">
            Premium
          </span>
        )}
        {supplier.verified && (
          <span className="bg-green-500 text-white text-xs font-semibold px-2 py-0.5 rounded flex items-center">
            ✅ Verified
          </span>
        )}
      </h2>
      <p className="text-gray-500">{supplier.category}</p>
      {supplier.website && (
        <p>
          <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            {supplier.website}
          </a>
        </p>
      )}
      {supplier.services.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-1">Services:</h3>
          <div className="flex flex-wrap gap-2">
            {supplier.services.map((service, index) => (
              <span key={index} className="bg-gray-200 text-xs px-2 py-1 rounded">
                {service}
              </span>
            ))}
          </div>
        </div>
      )}
      {supplier.products && supplier.products.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-1">Products:</h3>
          <ul className="list-disc list-inside text-sm text-gray-700">
            {supplier.products.map((product, index) => (
              <li key={index}>{product}</li>
            ))}
          </ul>
        </div>
      )}
      {(supplier.city || supplier.state) && (
        <p className="text-gray-600 text-sm">
          Location: {[supplier.city, supplier.state].filter(Boolean).join(', ')}
        </p>
      )}
    </div>
  );
}
