import React from 'react';
import { Supplier } from '../lib/types';

export default function SupplierCard({ supplier }: { supplier: Supplier }) {
  return (
    <div className="p-4 rounded-lg shadow-sm bg-white mb-4">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <span>{supplier.name}</span>
        {supplier.premium && (
          <span className="text-yellow-600 font-medium flex items-center gap-1">
            ✅ Premium
          </span>
        )}
        {supplier.verified && (
          <span className="text-green-600 font-medium flex items-center gap-1">
            ✅ Verified
          </span>
        )}
      </h2>
      <p className="text-gray-500 text-sm">{supplier.category}</p>
      {supplier.website && (
        <p className="mt-2">
          <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm block">
            {supplier.website}
          </a>
        </p>
      )}
      {supplier.services.length > 0 && (
        <div className="mt-3">
          <h3 className="font-semibold text-sm mb-1">Services:</h3>
          <ul className="list-disc list-inside text-sm text-gray-700">
            {supplier.services.map((service, index) => (
              <li key={index}>{service}</li>
            ))}
          </ul>
        </div>
      )}
      {supplier.products && supplier.products.length > 0 && (
        <div className="mt-3">
          <h3 className="font-semibold text-sm mb-1">Products:</h3>
          <ul className="list-disc list-inside text-sm text-gray-700">
            {supplier.products.map((product, index) => (
              <li key={index}>{product}</li>
            ))}
          </ul>
        </div>
      )}
      {(supplier.city || supplier.state) && (
        <p className="text-gray-600 text-sm mt-2">
          Location: {[supplier.city, supplier.state].filter(Boolean).join(', ')}
        </p>
      )}
    </div>
  );
}
