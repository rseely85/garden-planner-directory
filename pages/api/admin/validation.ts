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

    const categoryLookup = new Map<string, string>();
    const offeringLookup = new Map<string, string>();
    const productLookup = new Map<string, string>();
    const regionLookup = new Map<string, string>();

    suppliers.forEach((supplier) => {
      (supplier.categories || []).forEach((categoryId, index) => {
        const label = supplier.categoryLabels?.[index] ?? supplier.categoryLabel ?? categoryId;
        if (!categoryLookup.has(categoryId)) {
          categoryLookup.set(categoryId, label);
        }
      });

      (supplier.offerings || []).forEach((offeringId, index) => {
        const label = supplier.offeringLabels?.[index] ?? offeringId;
        if (!offeringLookup.has(offeringId)) {
          offeringLookup.set(offeringId, label);
        }
      });

      (supplier.products || []).forEach((productId, index) => {
        const label = supplier.productLabels?.[index] ?? productId;
        if (!productLookup.has(productId)) {
          productLookup.set(productId, label);
        }
      });

      if (supplier.regionId) {
        regionLookup.set(supplier.regionId, supplier.regionName || supplier.regionId);
      }
      if (supplier.derivedRegionId) {
        regionLookup.set(
          supplier.derivedRegionId,
          supplier.derivedRegionName || supplier.derivedRegionId,
        );
      }
    });

    const categoryOptions = Array.from(categoryLookup.entries()).map(([id, label]) => ({
      id,
      label,
    }));
    const regionOptions = Array.from(regionLookup.entries()).map(([id, label]) => ({
      id,
      label,
    }));

    const rawValid = normalizeQueryParam(req.query.valid);
    const categoryFilter = normalizeQueryParam(req.query.category);
    const regionFilter = normalizeQueryParam(req.query.region);
    const searchFilter = normalizeQueryParam(req.query.search)?.toLowerCase();
    const sortKey = normalizeQueryParam(req.query.sort);
    const sortDirection = normalizeQueryParam(req.query.direction) === "desc" ? "desc" : "asc";

    let filteredSuppliers = suppliers.map<ValidationEntry>((supplier) => {
      const primaryCategoryId = supplier.category ?? supplier.categories?.[0] ?? null;
      const primaryCategoryLabel = primaryCategoryId
        ? categoryLookup.get(primaryCategoryId) ?? supplier.categoryLabel ?? primaryCategoryId
        : null;
      const addressParts: string[] = [];
      const rawAddress = (supplier.raw as any)?.address || supplier.raw?.address;
      if (rawAddress?.city) addressParts.push(rawAddress.city);
      if (rawAddress?.state) addressParts.push(rawAddress.state);
      const address = supplier.location || addressParts.join(", ") || null;
      const resolvedRegionId = supplier.regionId || supplier.derivedRegionId || null;
      const resolvedRegionName =
        supplier.regionName ||
        supplier.derivedRegionName ||
        (resolvedRegionId ? regionLookup.get(resolvedRegionId) ?? resolvedRegionId : null);
      const categoryLabels = (supplier.categories || []).map(
        (id, index) => supplier.categoryLabels?.[index] ?? categoryLookup.get(id) ?? id,
      );
      const offeringLabels = (supplier.offerings || []).map(
        (id, index) => supplier.offeringLabels?.[index] ?? offeringLookup.get(id) ?? id,
      );
      const productLabels = (supplier.products || []).map(
        (id, index) => supplier.productLabels?.[index] ?? productLookup.get(id) ?? id,
      );

      return {
        id: supplier.id,
        name: supplier.name,
        slug: supplier.slug,
        categoryId: primaryCategoryId,
        categoryLabel: primaryCategoryLabel,
        categories: supplier.categories ?? [],
        categoryLabels,
        offerings: supplier.offerings ?? [],
        offeringLabels,
        products: supplier.products ?? [],
        productLabels,
        missingFields: supplier.missingFields ?? [],
        address,
        regionId: resolvedRegionId,
        regionLabel: resolvedRegionName,
        derivedRegionId: supplier.derivedRegionId ?? null,
        derivedRegionLabel: supplier.derivedRegionName ?? null,
        regionMismatch: supplier.regionMismatch ?? false,
        lastUpdated: supplier.lastUpdated ?? supplier.updatedAt ?? null,
        verified: supplier.verified ?? false,
      };
    });

    if (rawValid === "true") {
      filteredSuppliers = filteredSuppliers.filter((entry) => entry.missingFields.length === 0);
    } else if (rawValid === "false") {
      filteredSuppliers = filteredSuppliers.filter((entry) => entry.missingFields.length > 0);
    }

    if (categoryFilter) {
      filteredSuppliers = filteredSuppliers.filter((entry) =>
        (entry.categoryId || "").toLowerCase() === categoryFilter.toLowerCase(),
      );
    }

    if (regionFilter) {
      filteredSuppliers = filteredSuppliers.filter((entry) =>
        (entry.regionId || "").toLowerCase() === regionFilter.toLowerCase(),
      );
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

    console.log("📊 Validation report refreshed", {
      filters: { valid: rawValid, category: categoryFilter, region: regionFilter, search: searchFilter },
      count: filteredSuppliers.length,
    });

    const csvData = filteredSuppliers.map((entry) => ({
      name: entry.name,
      slug: entry.slug,
      category: entry.categoryLabel || entry.categoryId || "",
      address: entry.address || "",
      missingFields: entry.missingFields.join("; "),
      lastUpdated: entry.lastUpdated || "",
      verified: entry.verified ? "yes" : "no",
      region: entry.regionLabel || entry.regionId || "",
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
      categories: categoryOptions,
      regions: regionOptions,
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
