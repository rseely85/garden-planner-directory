// lib/types.ts
export type Category =
  | "garden-center"
  | "landscaping"
  | "bulk-materials"
  | "tree-service"
  | "greenhouse"
  | "native-nursery";

export interface Supplier {
  id: string;
  name: string;
  slug: string;
  category: Category;

  // Optional info
  website?: string;
  logo?: string;
  location?: string; // Firestore may store city/state separately later
  description?: string;
  image?: string;

  // Arrays
  services: string[];
  products: string[];

  // Address object (kept from previous version)
  address?: { city: string; state: string };

  // Flags
  premium?: boolean;
  verified?: boolean;
  region?: string | null;
  missingFields?: string[];
  updatedAt?: string | null;
  lastUpdated?: string | null;
}

export interface ValidationEntry {
  id: string;
  name: string;
  slug: string;
  category?: string | null;
  missingFields: string[];
  address?: string | null;
  region?: string | null;
  lastUpdated?: string | null;
  verified?: boolean;
}
