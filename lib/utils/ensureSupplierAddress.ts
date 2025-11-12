import type { SupplierAddress } from "@/lib/types";

type SupplierLike = Record<string, any> & { address?: SupplierAddress | null };

const normalizeAddressMapKeys = (address: SupplierAddress): Record<string, string> => {
  const normalized: Record<string, string> = {};
  Object.entries(address).forEach(([key, value]) => {
    if (typeof key === "string" && key.includes(".")) {
      const segments = key.split(".");
      const last = segments[segments.length - 1];
      normalized[last] = String(value ?? "");
    } else {
      normalized[key] = String(value ?? "");
    }
  });
  return normalized;
};

const getNestedValue = (source: SupplierLike, path: string): unknown => {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  if (Object.prototype.hasOwnProperty.call(source, path)) {
    return (source as Record<string, unknown>)[path];
  }

  const segments = path.split(".");
  let cursor: any = source;
  for (let index = 0; index < segments.length; index += 1) {
    if (cursor === null || cursor === undefined) {
      return undefined;
    }

    const remainingPath = segments.slice(index).join(".");
    if (remainingPath && Object.prototype.hasOwnProperty.call(cursor, remainingPath)) {
      return cursor[remainingPath];
    }

    const segment = segments[index];
    if (!Object.prototype.hasOwnProperty.call(cursor, segment)) {
      return undefined;
    }
    cursor = cursor[segment];
  }
  return cursor;
};

const toTrimmedString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const normalized = typeof value === "string" ? value : String(value);
  const trimmed = normalized.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const pickAddressValue = (source: SupplierLike, paths: string[]): string | undefined => {
  for (const path of paths) {
    const candidate = getNestedValue(source, path);
    const normalized = toTrimmedString(candidate);
    if (normalized !== undefined) {
      return normalized;
    }
  }
  return undefined;
};

export const ensureSupplierAddress = <T extends SupplierLike>(supplier: T): T & { address?: SupplierAddress | null } => {
  if (!supplier || typeof supplier !== "object") {
    return supplier as T & { address?: SupplierAddress };
  }

  const baseAddress =
    typeof supplier.address === "object" && supplier.address !== null
      ? normalizeAddressMapKeys(supplier.address as SupplierAddress)
      : undefined;

  const source: SupplierLike = baseAddress ? { ...supplier, address: baseAddress } : supplier;

  const updates: SupplierAddress = {};
  const street = pickAddressValue(source, ["address.street", "street", "addressStreet"]);
  const city = pickAddressValue(source, ["address.city", "city", "addressCity"]);
  const county = pickAddressValue(source, ["address.county", "county", "addressCounty"]);
  const state = pickAddressValue(source, ["address.state", "state", "addressState"]);
  const zip = pickAddressValue(source, ["address.zip", "zip", "postalCode", "addressZip"]);
  const regionId = pickAddressValue(source, ["address.regionId", "regionId", "addressRegionId"]);

  if (street) updates.street = street;
  if (city) updates.city = city;
  if (county) updates.county = county;
  if (state) updates.state = state;
  if (zip) updates.zip = zip;
  if (regionId) updates.regionId = regionId;

  if (Object.keys(updates).length === 0) {
    const existingAddress =
      typeof supplier.address === "object" && supplier.address !== null ? (supplier.address as SupplierAddress) : undefined;
    return existingAddress ? { ...supplier, address: existingAddress } : supplier;
  }

  const existing: SupplierAddress = baseAddress ? (baseAddress as SupplierAddress) : {};

  return {
    ...(supplier as Record<string, unknown>),
    address: {
      ...existing,
      ...updates,
    },
  } as T & { address?: SupplierAddress | null | undefined };
};
