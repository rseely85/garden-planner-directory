export type FieldKind = "string" | "number" | "boolean" | "stringArray" | "json";
export type FieldWidget =
  | "text"
  | "textarea"
  | "checkbox"
  | "select"
  | "multi-select"
  | "time"
  | "code";
export type OptionSource =
  | "categories"
  | "offerings"
  | "products"
  | "regions"
  | "suppliers"
  | "daysOfWeek"
  | "halfHourTimes";

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldKind;
  required?: boolean;
  description?: string;
  placeholder?: string;
  defaultValue?: unknown;
  widget?: FieldWidget;
  optionsSource?: OptionSource;
  allowMultiple?: boolean;
}

export interface MaintenanceCollectionConfig {
  id: string;
  collection: string;
  label: string;
  description: string;
  primaryField?: string;
  searchFields: string[];
  fields: FieldConfig[];
  idFromField?: string;
}

export const SUPPLIER_DELETE_CONFIRMATION_CODE = "4961";

export const maintenanceCollections: MaintenanceCollectionConfig[] = [
  {
    id: "categories",
    collection: "categories",
    label: "Categories",
    description: "High-level groupings that suppliers can be assigned to.",
    primaryField: "name",
    searchFields: ["name", "description"],
    idFromField: "name",
    fields: [
      { key: "name", label: "Name", type: "string", required: true, widget: "text" },
      { key: "description", label: "Description", type: "string", widget: "textarea" },
    ],
  },
  {
    id: "offerings",
    collection: "offerings",
    label: "Offerings",
    description: "Services offered under a category.",
    primaryField: "name",
    searchFields: ["name"],
    idFromField: "name",
    fields: [
      { key: "name", label: "Name", type: "string", required: true, widget: "text" },
      { key: "description", label: "Description", type: "string", widget: "textarea" },
    ],
  },
  {
    id: "products",
    collection: "products",
    label: "Products",
    description: "Products that can be tied to supplier offerings.",
    primaryField: "name",
    searchFields: ["name"],
    idFromField: "name",
    fields: [
      { key: "name", label: "Name", type: "string", required: true, widget: "text" },
      { key: "description", label: "Description", type: "string", widget: "textarea" },
    ],
  },
  {
    id: "regions",
    collection: "regions",
    label: "Regions",
    description: "Geographic regions and their ZIP coverage.",
    primaryField: "name",
    searchFields: ["name", "state"],
    idFromField: "name",
    fields: [
      { key: "name", label: "Name", type: "string", required: true, widget: "text" },
      { key: "state", label: "State", type: "string", required: true, defaultValue: "NY", widget: "text" },
      {
        key: "counties",
        label: "Counties",
        type: "stringArray",
        description: "List of counties (one per line).",
        widget: "textarea",
      },
      {
        key: "zipCodes",
        label: "ZIP Codes",
        type: "stringArray",
        description: "ZIP codes covered by this region (one per line).",
        required: true,
        widget: "textarea",
      },
    ],
  },
  {
    id: "supplierCategories",
    collection: "supplierCategories",
    label: "Supplier Categories",
    description: "Category assignments for suppliers.",
    primaryField: "supplierId",
    searchFields: ["supplierId", "categoryId"],
    fields: [
      { key: "supplierId", label: "Supplier", type: "string", required: true, widget: "select", optionsSource: "suppliers" },
      {
        key: "categoryId",
        label: "Categories",
        type: "stringArray",
        required: true,
        widget: "multi-select",
        optionsSource: "categories",
        allowMultiple: true,
      },
    ],
  },
  {
    id: "supplierOfferings",
    collection: "supplierOfferings",
    label: "Supplier Offerings",
    description: "Offering assignments for suppliers.",
    primaryField: "supplierId",
    searchFields: ["supplierId", "offeringId"],
    fields: [
      { key: "supplierId", label: "Supplier", type: "string", required: true, widget: "select", optionsSource: "suppliers" },
      {
        key: "offeringId",
        label: "Offerings",
        type: "stringArray",
        required: true,
        widget: "multi-select",
        optionsSource: "offerings",
        allowMultiple: true,
      },
    ],
  },
  {
    id: "supplierProducts",
    collection: "supplierProducts",
    label: "Supplier Products",
    description: "Product assignments for suppliers.",
    primaryField: "supplierId",
    searchFields: ["supplierId", "productId"],
    fields: [
      { key: "supplierId", label: "Supplier", type: "string", required: true, widget: "select", optionsSource: "suppliers" },
      {
        key: "productId",
        label: "Products",
        type: "stringArray",
        required: true,
        widget: "multi-select",
        optionsSource: "products",
        allowMultiple: true,
      },
    ],
  },
  {
    id: "openHours",
    collection: "openHours",
    label: "Open Hours",
    description: "Supplier business hours by day of week.",
    primaryField: "supplierId",
    searchFields: ["supplierId", "dayOfWeek"],
    fields: [
      { key: "supplierId", label: "Supplier", type: "string", required: true, widget: "select", optionsSource: "suppliers" },
      { key: "dayOfWeek", label: "Day of Week", type: "string", required: true, widget: "select", optionsSource: "daysOfWeek" },
      { key: "openTime", label: "Opens At", type: "string", placeholder: "09:00", widget: "select", optionsSource: "halfHourTimes" },
      { key: "closeTime", label: "Closes At", type: "string", placeholder: "17:00", widget: "select", optionsSource: "halfHourTimes" },
      {
        key: "notes",
        label: "Notes",
        type: "string",
        description: "Optional notes about special hours or closures.",
        widget: "textarea",
      },
    ],
  },
  {
    id: "photos",
    collection: "photos",
    label: "Photos",
    description: "Photo metadata for supplier galleries.",
    primaryField: "supplierId",
    searchFields: ["supplierId", "url"],
    fields: [
      { key: "supplierId", label: "Supplier", type: "string", required: true, widget: "select", optionsSource: "suppliers" },
      { key: "url", label: "Photo URL", type: "string", required: true, widget: "text" },
      { key: "caption", label: "Caption", type: "string", widget: "textarea" },
      {
        key: "tags",
        label: "Tags",
        type: "stringArray",
        description: "Optional tags or keywords (one per line).",
        widget: "textarea",
      },
    ],
  },
  {
    id: "suppliers",
    collection: "suppliers",
    label: "Suppliers",
    description: "Supplier master data records.",
    primaryField: "name",
    searchFields: ["name", "slug", "email", "address.city", "address.state", "address.zip"],
    idFromField: "name",
    fields: [
      { key: "name", label: "Name", type: "string", required: true, widget: "text" },
      { key: "slug", label: "Slug", type: "string", widget: "code", description: "Auto-generated from name and locked after creation." },
      { key: "email", label: "Email", type: "string", required: true, widget: "text" },
      { key: "phone", label: "Phone", type: "string", required: true, widget: "text" },
      { key: "website", label: "Website", type: "string", widget: "text" },
      { key: "description", label: "Description", type: "string", widget: "textarea" },
      { key: "verified", label: "Verified", type: "boolean", defaultValue: false, widget: "checkbox" },
      { key: "premium", label: "Premium", type: "boolean", defaultValue: false, widget: "checkbox" },
      { key: "address.street", label: "Street", type: "string", required: true, widget: "text" },
      { key: "address.city", label: "City", type: "string", required: true, widget: "text" },
      { key: "address.zip", label: "ZIP", type: "string", required: true, placeholder: "Five digits", widget: "text" },
      { key: "address.state", label: "State", type: "string", required: true, widget: "text" },
      { key: "address.regionId", label: "Region ID", type: "string", required: true, widget: "text" },
    ],
  },
];

export const maintenanceCollectionMap = new Map(
  maintenanceCollections.map((config) => [config.id, config] as const),
);

export function getCollectionConfig(collectionId: string): MaintenanceCollectionConfig | undefined {
  return maintenanceCollectionMap.get(collectionId);
}

export function coerceFieldValue(field: FieldConfig, value: unknown): unknown {
  if (value === undefined || value === null || value === "") {
    return field.required ? "" : undefined;
  }

  switch (field.type) {
    case "string":
      return String(value);
    case "number": {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : value;
    }
    case "boolean":
      return value === true || value === "true" || value === "on";
    case "stringArray": {
      if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter((item) => item.length > 0);
      }
      if (typeof value === "string") {
        return value
          .split(/\r?\n/)
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
      }
      return [];
    }
    case "json":
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    default:
      return value;
  }
}
