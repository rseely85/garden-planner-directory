// lib/firestore.ts
import { Supplier } from "./types";

// Named export (NOT default) to avoid “getSuppliers is not a function”.
export async function getSuppliers(): Promise<Supplier[]> {
  return [
    {
      id: "sup1",
      name: "Rochester Garden Center",
      slug: "rochester-garden-center",
      category: "garden-center",
      services: ["delivery"],
      products: ["perennials"],
      address: { city: "Rochester", state: "NY" },
      premium: true,
      verified: true,
    },
    {
      id: "sup2",
      name: "Buffalo Landscape Supply",
      slug: "buffalo-landscape-supply",
      category: "bulk-materials",
      services: ["delivery"],
      products: ["mulch", "topsoil"],
      address: { city: "Buffalo", state: "NY" },
      premium: false,
      verified: true,
    },
    {
      id: "sup3",
      name: "Syracuse Greenhouse",
      slug: "syracuse-greenhouse",
      category: "greenhouse",
      services: ["delivery"],
      products: ["annuals"],
      address: { city: "Syracuse", state: "NY" },
      premium: true,
      verified: false,
    },
  ];
}