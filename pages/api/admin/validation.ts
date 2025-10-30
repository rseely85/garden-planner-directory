import type { NextApiRequest, NextApiResponse } from "next";
import { Parser } from "json2csv";
import { getSupplierStats } from "../../../lib/getSupplierStats";
import type { ValidationEntry } from "@/lib/types";

const normalizeQueryParam = (param: string | string[] | undefined): string | undefined => {
  if (!param) return undefined;
  if (Array.isArray(param)) return param[0];
  return param;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    console.log("🔍 Running supplier validation check...");

    const { suppliers } = await getSupplierStats();

    const rawValid = normalizeQueryParam(req.query.valid);
    const categoryFilter = normalizeQueryParam(req.query.category);
    const regionFilter = normalizeQueryParam(req.query.region);
    const searchFilter = normalizeQueryParam(req.query.search)?.toLowerCase();
    const sortKey = normalizeQueryParam(req.query.sort);
    const sortDirection = normalizeQueryParam(req.query.direction) === "desc" ? "desc" : "asc";

    let filteredSuppliers = suppliers.map<ValidationEntry>((supplier) => ({
      id: supplier.id,
      name: supplier.name,
      slug: supplier.slug,
      category: supplier.category || null,
      missingFields: supplier.missingFields ?? [],
      address: supplier.location || supplier.region || null,
      region: supplier.region ?? supplier.location ?? null,
      lastUpdated: supplier.lastUpdated ?? supplier.updatedAt ?? null,
      verified: supplier.verified ?? false,
    }));

    if (rawValid === "true") {
      filteredSuppliers = filteredSuppliers.filter((entry) => entry.missingFields.length === 0);
    } else if (rawValid === "false") {
      filteredSuppliers = filteredSuppliers.filter((entry) => entry.missingFields.length > 0);
    }

    if (categoryFilter) {
      filteredSuppliers = filteredSuppliers.filter((entry) => (entry.category || "").toLowerCase() === categoryFilter.toLowerCase());
    }

    if (regionFilter) {
      filteredSuppliers = filteredSuppliers.filter((entry) => (entry.region || "").toLowerCase() === regionFilter.toLowerCase());
    }

    if (searchFilter) {
      filteredSuppliers = filteredSuppliers.filter((entry) => {
        const target = `${entry.name || ""} ${entry.slug || ""}`.toLowerCase();
        return target.includes(searchFilter);
      });
    }

    if (sortKey) {
      const key = sortKey as keyof ValidationEntry;
      filteredSuppliers = filteredSuppliers.sort((a, b) => {
        const aVal = a[key] ?? "";
        const bVal = b[key] ?? "";
        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortDirection === "desc"
            ? bVal.localeCompare(aVal)
            : aVal.localeCompare(bVal);
        }
        if (typeof aVal === "boolean" && typeof bVal === "boolean") {
          return sortDirection === "desc"
            ? Number(bVal) - Number(aVal)
            : Number(aVal) - Number(bVal);
        }
        return 0;
      });
    }

    const totalSuppliers = suppliers.length;
    const invalidCount = suppliers.filter((supplier) => supplier.missingFields?.length).length;
    const validCount = totalSuppliers - invalidCount;

    const categories = Array.from(new Set(suppliers.map((s) => s.category).filter(Boolean))) as string[];
    const regions = Array.from(new Set(suppliers.map((s) => s.region || s.location).filter(Boolean))) as string[];

    console.log("📊 Validation report refreshed", {
      filters: { valid: rawValid, category: categoryFilter, region: regionFilter, search: searchFilter },
      count: filteredSuppliers.length,
    });

    const csvData = filteredSuppliers.map((entry) => ({
      name: entry.name,
      slug: entry.slug,
      category: entry.category || "",
      address: entry.address || "",
      missingFields: entry.missingFields.join("; "),
      lastUpdated: entry.lastUpdated || "",
      verified: entry.verified ? "yes" : "no",
    }));

    if (req.query.format === "csv") {
      const filterParts: string[] = [];
      if (rawValid === "true") filterParts.push("Only Valid");
      else if (rawValid === "false") filterParts.push("Only Invalid");
      if (categoryFilter) filterParts.push(`Category: ${categoryFilter}`);
      if (regionFilter) filterParts.push(`Region: ${regionFilter}`);
      if (searchFilter) filterParts.push(`Search: ${searchFilter}`);
      const filterSummary = filterParts.length ? `Filter: ${filterParts.join(", ")}` : "Filter: None";

      const parser = new Parser({
        fields: ["name", "slug", "category", "address", "missingFields", "lastUpdated", "verified"],
      });
      const csvBody = parser.parse(csvData);
      const csv = `${filterSummary}\n${csvBody}`;
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=validation_report.csv");
      return res.status(200).send(csv);
    }

    if (filteredSuppliers.length === 0) {
      console.warn("⚠️ No matching suppliers for current filters.");
    }

    return res.status(200).json({
      status: "success",
      totalSuppliers,
      invalidCount,
      validCount,
      filteredCount: filteredSuppliers.length,
      categories,
      regions,
      filters: {
        valid: rawValid || "all",
        category: categoryFilter || "",
        region: regionFilter || "",
        search: searchFilter || "",
      },
      sort: { key: sortKey || null, direction: sortDirection },
      incompleteSuppliers: filteredSuppliers,
    });
  } catch (error: any) {
    console.error("🔥 Validation API error:", error.message);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch incomplete supplier data",
      details: error.message,
    });
  }
}
