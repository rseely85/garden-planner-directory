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
}