// Shared TypeScript interfaces for Garden Planner Directory

export interface Supplier {
  id: string;
  name: string;
  slug: string;
  category: "garden-center" | "landscaping" | "bulk-materials" | "tree-service" | "greenhouse" | "native-nursery";
  services: string[];
  products: string[];
  address: {
    street?: string;
    city: string;
    county?: string;
    state: string;
    zip?: string;
  };
  geo?: { lat: number; lng: number };
  phone?: string;
  website?: string;
  email?: string;
  ratingAvg?: number;
  ratingCount?: number;
  premium?: boolean;
  verified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProductCatalogItem {
  id: string;
  label: string;
  tags?: string[];
  synonyms?: string[];
}

export interface Review {
  id: string;
  supplierId: string;
  userId: string;
  rating: number;
  text: string;
  createdAt: Date;
  status: "published" | "pending" | "rejected";
}