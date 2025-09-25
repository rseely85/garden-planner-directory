import React from 'react';
import { useRouter } from 'next/router';
import ReviewList from '../../components/ReviewList';
import ReviewForm from '../../components/ReviewForm';
import { getSupplierBySlug } from '../../lib/firestore';

export default function SupplierPage() {
  const router = useRouter();
  const { slug } = router.query;

  // TODO: fetch supplier data with getSupplierBySlug(slug)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Supplier Profile</h1>
      <p className="text-gray-600">TODO: Show supplier details for {slug}</p>
      {/* TODO: Add map, services, products, reviews */}
      <ReviewList />
      <ReviewForm />
    </div>
  );
}
