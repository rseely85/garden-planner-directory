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
  services: string[];
  products: string[];
  address: { city: string; state: string };
  premium?: boolean;
  verified?: boolean;
}