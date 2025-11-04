// lib/types.ts
export interface SupplierAddress {
  street?: string;
  city?: string;
  county?: string;
  state?: string;
  zip?: string;
  regionId?: string | null;
}

export interface SupplierRecord {
  id: string;
  slug: string;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  logo?: string;
  description?: string;
  location?: string;
  verified?: boolean;
  premium?: boolean;
  address?: SupplierAddress;
  createdAt?: string | null;
  updatedAt?: string | null;
  lastUpdated?: string | null;
}

/**
 * SupplierView represents the denormalised data we send to the UI.
 * Relationships (categories/offerings/products) are resolved separately
 * from the underlying join collections.
 */
export interface SupplierView extends SupplierRecord {
  categories?: string[];
  offerings?: string[];
  products?: string[];
  category?: string | null;
  services?: string[];
  categoryLabels?: string[];
  offeringLabels?: string[];
  productLabels?: string[];
  categoryLabel?: string | null;
}

export interface CategoryRecord {
  id: string;
  name: string;
  description?: string;
}

export interface OfferingRecord {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
}

export interface ProductRecord {
  id: string;
  name: string;
  description?: string;
  offeringIds: string[];
}

export interface RegionRecord {
  id: string;
  name: string;
  state: string;
  counties: string[];
  zipCodes: string[];
}

export interface SupplierCategoryLink {
  supplierId: string;
  categoryId: string;
}

export interface SupplierOfferingLink {
  supplierId: string;
  offeringId: string;
}

export interface SupplierProductLink {
  supplierId: string;
  productId: string;
  offeringId?: string;
}

export interface ValidationEntry {
  id: string;
  name: string;
  slug: string;
  missingFields: string[];
  categoryId?: string | null;
  categoryLabel?: string | null;
  categories?: string[];
  categoryLabels?: string[];
  offerings?: string[];
  offeringLabels?: string[];
  products?: string[];
  productLabels?: string[];
  address?: string | null;
  regionId?: string | null;
  regionLabel?: string | null;
  derivedRegionId?: string | null;
  derivedRegionLabel?: string | null;
  regionMismatch?: boolean;
  lastUpdated?: string | null;
  verified?: boolean;
}

// Legacy compatibility aliases (UI still expects these names)
export type Supplier = SupplierView;
export type Category = string;
