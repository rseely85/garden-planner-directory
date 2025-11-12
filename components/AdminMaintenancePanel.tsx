import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  getCollectionConfig,
  maintenanceCollections,
  type OptionSource,
  SUPPLIER_DELETE_CONFIRMATION_CODE,
  type FieldConfig,
  type MaintenanceCollectionConfig,
} from "@/lib/admin/maintenanceMetadata";
import { ensureSupplierAddress } from "@/lib/utils/ensureSupplierAddress";

type MaintenanceRecord = Record<string, unknown> & { id: string };

type ModalMode = "create" | "edit";

type ModalState =
  | {
      open: false;
    }
  | {
      open: true;
      mode: ModalMode;
      docId?: string;
      formValues: Record<string, string | boolean | string[]>;
      submitting: boolean;
      error: string | null;
      associations?: {
        categories: string[];
        offerings: string[];
        products: string[];
      };
    };

const CLOSED_MODAL: ModalState = { open: false };
const SUPPLIER_COLLECTION_ID = "suppliers";
const ASSOCIATION_COLLECTIONS = new Set(["supplierCategories", "supplierOfferings", "supplierProducts"]);
const SUPPLIER_CATEGORY_FORM_KEY = "__supplierCategories";
const SUPPLIER_OFFERING_FORM_KEY = "__supplierOfferings";
const SUPPLIER_PRODUCT_FORM_KEY = "__supplierProducts";
const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const HALF_HOUR_TIMES = (() => {
  const values: string[] = [];
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  for (let hour = 0; hour < 24; hour += 1) {
    for (let half = 0; half < 2; half += 1) {
      const minutes = half === 0 ? "00" : "30";
      const suffix = hour < 12 ? "am" : "pm";
      const hour12 = hour % 12 === 0 ? 12 : hour % 12;
      values.push(`${pad(hour12)}:${minutes}${suffix}`);
    }
  }
  return values;
})();

type DayState = {
  enabled: boolean;
  open: string;
  close: string;
  hadExisting?: boolean;
};

const createDocumentIdPreview = (raw: unknown): string | null => {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const cleaned = trimmed
    .replace(/[^A-Za-z0-9\s_-]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || null;
};

const normalizeZip = (value: string | number | undefined | null): string => {
  if (value === undefined || value === null) return "";
  const digitsOnly = String(value).replace(/\D/g, "");
  return digitsOnly.length > 5 ? digitsOnly.slice(0, 5) : digitsOnly;
};

const assignNestedValue = (target: Record<string, unknown>, path: string, value: unknown) => {
  const segments = path.split(".");
  let cursor: Record<string, unknown> = target;
  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
      cursor[segment] = value;
      return;
    }
    if (typeof cursor[segment] !== "object" || cursor[segment] === null) {
      cursor[segment] = {};
    }
    cursor = cursor[segment] as Record<string, unknown>;
  });
};

const getValueByPath = (source: Record<string, unknown>, path: string): unknown => {
  const segments = path.split(".");
  let cursor: any = source;
  for (const segment of segments) {
    if (cursor === null || cursor === undefined) {
      return undefined;
    }
    cursor = cursor[segment];
  }
  return cursor;
};

const fieldDisplay = (field: FieldConfig, value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }
  switch (field.type) {
    case "boolean":
      return value === true ? "Yes" : value === false ? "No" : "";
    case "stringArray":
      if (Array.isArray(value)) {
        return value.join(", ");
      }
      return String(value);
    case "json":
      return typeof value === "string" ? value : JSON.stringify(value);
    default:
      return String(value);
  }
};

const toFormValue = (field: FieldConfig, recordValue: unknown): string | boolean | string[] => {
  if (field.widget === "multi-select") {
    if (Array.isArray(recordValue)) {
      return recordValue.map((item) => String(item));
    }
    if (recordValue === undefined || recordValue === null || String(recordValue).length === 0) {
      return [];
    }
    return [String(recordValue)];
  }

  if (recordValue === undefined || recordValue === null) {
    if (field.type === "boolean" || field.widget === "checkbox") {
      return false;
    }
    if (field.type === "stringArray") {
      return "";
    }
    return field.defaultValue !== undefined ? String(field.defaultValue) : "";
  }

  switch (field.type) {
    case "boolean":
      return Boolean(recordValue);
    case "stringArray":
      if (Array.isArray(recordValue)) {
        return recordValue.map((item) => String(item)).join("\n");
      }
      return String(recordValue);
    case "json":
      try {
        return typeof recordValue === "string"
          ? recordValue
          : JSON.stringify(recordValue, null, 2);
      } catch {
        return String(recordValue);
      }
    default:
      return String(recordValue ?? "");
  }
};

const AdminMaintenancePanel: React.FC = () => {
  const [activeCollectionId, setActiveCollectionId] = useState<string>(maintenanceCollections[0]?.id ?? "");
  const [items, setItems] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [modal, setModal] = useState<ModalState>(CLOSED_MODAL);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelMessage, setPanelMessage] = useState<string | null>(null);
  const [zipLookup, setZipLookup] = useState<Map<string, { regionId: string; state: string }>>(new Map());
  const [loadingReference, setLoadingReference] = useState(false);
  const [referenceData, setReferenceData] = useState<{
    categories: Array<{ id: string; name: string }>;
    offerings: Array<{ id: string; name: string; categoryId?: string }>;
    products: Array<{ id: string; name: string; offeringIds?: string[] }>;
    regions: Array<{ id: string; name?: string }>;
    suppliers: Array<{ id: string; name: string }>;
  }>({
    categories: [],
    offerings: [],
    products: [],
    regions: [],
    suppliers: [],
  });

  const activeConfig = useMemo<MaintenanceCollectionConfig | undefined>(
    () => getCollectionConfig(activeCollectionId),
    [activeCollectionId],
  );
  const isAssociationCollection = ASSOCIATION_COLLECTIONS.has(activeCollectionId);
  const isOpenHoursCollection = activeCollectionId === "openHours";
  const requiresRowSelection = !isAssociationCollection && !isOpenHoursCollection;

  const resolveOptions = useCallback(
    (source?: OptionSource) => {
      if (!source) return [];
      switch (source) {
        case "categories":
          return referenceData.categories.map((item) => ({ value: item.id, label: item.name || item.id }));
        case "offerings":
          return referenceData.offerings.map((item) => ({ value: item.id, label: item.name || item.id }));
        case "products":
          return referenceData.products.map((item) => ({ value: item.id, label: item.name || item.id }));
        case "regions":
          return referenceData.regions.map((item) => ({
            value: item.id,
            label: item.name ? `${item.name} (${item.id})` : item.id,
          }));
        case "suppliers":
          return referenceData.suppliers.map((item) => ({ value: item.id, label: item.name || item.id }));
        case "daysOfWeek":
          return DAYS_OF_WEEK.map((day) => ({ value: day, label: day }));
        case "halfHourTimes":
          return HALF_HOUR_TIMES.map((time) => ({ value: time, label: time }));
        default:
          return [];
      }
    },
    [referenceData],
  );

  const syncSupplierAssociations = useCallback(
    async (
      supplierId: string,
      desired: { categories: string[]; offerings: string[]; products: string[] },
      existing: { categories: string[]; offerings: string[]; products: string[] },
    ) => {
      const plans = [
        {
          endpoint: "/api/admin/supplierCategories",
          field: "categoryId",
          desired: desired.categories,
          existing: existing.categories,
        },
        {
          endpoint: "/api/admin/supplierOfferings",
          field: "offeringId",
          desired: desired.offerings,
          existing: existing.offerings,
        },
        {
          endpoint: "/api/admin/supplierProducts",
          field: "productId",
          desired: desired.products,
          existing: existing.products,
        },
      ] as const;

      for (const plan of plans) {
        const toAdd = plan.desired.filter((value) => value && !plan.existing.includes(value));
        const toRemove = plan.existing.filter((value) => value && !plan.desired.includes(value));

        for (const value of toAdd) {
          const response = await fetch(plan.endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ supplierId, [plan.field]: value }),
          });
          const data = await response.json();
          if (!response.ok || !data?.success) {
            throw new Error(data?.message || `Failed to add ${plan.field} link.`);
          }
        }

        for (const value of toRemove) {
          const response = await fetch(plan.endpoint, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ supplierId, [plan.field]: value }),
          });
          const data = await response.json();
          if (!response.ok || !data?.success) {
            throw new Error(data?.message || `Failed to remove ${plan.field} link.`);
          }
        }
      }
    },
    [],
  );

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchTerm.trim().toLowerCase()), 250);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  useEffect(() => {
    const loadReferenceData = async () => {
      setLoadingReference(true);
      try {
        const response = await fetch("/api/admin/masterData");
        const data = await response.json();
        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Failed to load master data.");
        }

        setReferenceData({
          categories: data.categories || [],
          offerings: data.offerings || [],
          products: data.products || [],
          regions: data.regions || [],
          suppliers: data.suppliers || [],
        });

        const map = new Map<string, { regionId: string; state: string }>();
        (data.regions || []).forEach((region: any) => {
          const regionId = region.id;
          const state = region.state || "NY";
          const zipCodes = Array.isArray(region.zipCodes) ? region.zipCodes : [];
          zipCodes.forEach((zip: unknown) => {
            const normalized = normalizeZip(zip as any);
            if (normalized) {
              map.set(normalized, { regionId, state });
            }
          });
        });
        setZipLookup(map);
      } catch (err) {
        console.error("❌ Failed to load master reference data:", err);
      } finally {
        setLoadingReference(false);
      }
    };
    loadReferenceData();
  }, []);

  const fetchItems = useCallback(async () => {
    if (!activeConfig) return;
    setLoading(true);
    setError(null);
    try {
      let rawItems: MaintenanceRecord[] = [];
      if (activeConfig.id === SUPPLIER_COLLECTION_ID) {
        const response = await fetch("/api/admin/suppliers");
        const data = await response.json();
        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Failed to load suppliers.");
        }
        rawItems = Array.isArray(data.suppliers)
          ? (data.suppliers as MaintenanceRecord[]).map((supplier) => ensureSupplierAddress<MaintenanceRecord>(supplier))
          : [];
      } else {
        const response = await fetch(`/api/admin/collections/${activeConfig.id}`);
        const data = await response.json();
        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Failed to load collection.");
        }
        rawItems = Array.isArray(data.items) ? data.items : [];
      }

      const deduped = rawItems.reduce<MaintenanceRecord[]>((acc, item) => {
        if (!item || typeof item !== "object") {
          return acc;
        }
        const id = String((item as MaintenanceRecord).id ?? "");
        if (!id) {
          return acc;
        }
        if (!acc.some((existing) => existing.id === id)) {
          acc.push(item as MaintenanceRecord);
        }
        return acc;
      }, []);
      setItems(deduped);
      console.log(`📥 Loaded ${activeConfig.label}:`, deduped.length, "records");
    } catch (err: any) {
      console.error(`❌ Failed to load ${activeConfig.label}:`, err);
      setError(err?.message || "Unable to load collection.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeConfig]);

  useEffect(() => {
    fetchItems();
    setSearchTerm("");
    setModal(CLOSED_MODAL);
    setPanelMessage(null);
  }, [fetchItems]);

  useEffect(() => {
    if (!selectedId) return;
    const stillExists = items.some((item) => item.id === selectedId);
    if (!stillExists) {
      setSelectedId(null);
    }
  }, [items, selectedId]);

  const selectedRecord = useMemo(
    () => (selectedId ? items.find((item) => item.id === selectedId) ?? null : null),
    [items, selectedId],
  );

  const filteredItems = useMemo(() => {
    if (!activeConfig) return [];
    if (!debouncedSearch) return items;

    return items.filter((item) =>
      activeConfig.searchFields.some((field) => {
        const raw = getValueByPath(item, field);
        if (raw === undefined || raw === null) {
          return false;
        }
        return String(raw).toLowerCase().includes(debouncedSearch);
      }),
    );
  }, [items, activeConfig, debouncedSearch]);

  const openModal = async (mode: ModalMode, record?: MaintenanceRecord) => {
    if (!activeConfig) return;
    const baseFormValues = activeConfig.fields.reduce<Record<string, string | boolean | string[]>>((acc, field) => {
      const existing = record ? getValueByPath(record, field.key) : undefined;
      acc[field.key] = toFormValue(field, existing);
      return acc;
    }, {});

    let supplierAssociations: { categories: string[]; offerings: string[]; products: string[] } | undefined;
    if (activeConfig.id === SUPPLIER_COLLECTION_ID) {
      const dedupe = (values: unknown[]): string[] =>
        Array.from(new Set(values.map((value) => String(value)).filter((value) => value.length > 0)));

      const existingCategories = Array.isArray(record?.categories)
        ? dedupe(record!.categories as unknown[])
        : record?.category
        ? [String(record.category)]
        : [];
      const existingOfferings = Array.isArray(record?.offerings)
        ? dedupe(record!.offerings as unknown[])
        : Array.isArray(record?.services)
        ? dedupe(record!.services as unknown[])
        : [];
      const existingProducts = Array.isArray(record?.products) ? dedupe(record!.products as unknown[]) : [];

      supplierAssociations = {
        categories: existingCategories,
        offerings: existingOfferings,
        products: existingProducts,
      };

      baseFormValues[SUPPLIER_CATEGORY_FORM_KEY] = existingCategories;
      baseFormValues[SUPPLIER_OFFERING_FORM_KEY] = existingOfferings;
      baseFormValues[SUPPLIER_PRODUCT_FORM_KEY] = existingProducts;
    }

    const defaultSupplierId =
      (record?.supplierId as string) ||
      referenceData.suppliers[0]?.id ||
      "";

    if (ASSOCIATION_COLLECTIONS.has(activeConfig.id)) {
      const associationField = activeConfig.fields.find((field) => field.key !== "supplierId");
      baseFormValues.supplierId = defaultSupplierId;
      if (associationField) {
        const currentValues = items
          .filter((item) => item.supplierId === defaultSupplierId)
          .map((item) => String(item[associationField.key]));
        baseFormValues[associationField.key] = currentValues;
      }
    }

    if (activeConfig.id === "openHours") {
      baseFormValues.supplierId = defaultSupplierId;
    }

  setModal({
    open: true,
    mode,
    docId: record?.id,
    formValues: baseFormValues,
    submitting: false,
    error: null,
    associations:
      activeConfig.id === SUPPLIER_COLLECTION_ID
        ? supplierAssociations ?? { categories: [], offerings: [], products: [] }
        : undefined,
  });
  };

  const closeModal = () => setModal(CLOSED_MODAL);

  const handleFormChange = (key: string, value: string | boolean | string[]) => {
    if (!modal.open) return;
    setModal((prev) =>
      prev.open
        ? {
            ...prev,
            formValues: {
              ...prev.formValues,
              [key]: value,
            },
          }
        : prev,
    );
  };

  const handleBulkChange = (entries: Record<string, string | string[]>) => {
    if (!modal.open) return;
    setModal((prev) =>
      prev.open
        ? {
            ...prev,
            formValues: {
              ...prev.formValues,
              ...entries,
            },
          }
        : prev,
    );
  };

  const getAssociationFieldKey = (config: MaintenanceCollectionConfig) => {
    const field = config.fields.find((entry) => entry.key !== "supplierId");
    return field?.key;
  };

  const saveAssociationSelections = async (payload: { supplierId?: string; selections: string[] }) => {
    if (!activeConfig) return;
    const supplierId = payload.supplierId?.trim();
    if (!supplierId) {
      setPanelMessage("Select a supplier before saving.");
      return;
    }
    const associationFieldKey = getAssociationFieldKey(activeConfig);
    if (!associationFieldKey) {
      setPanelMessage("Association field could not be determined.");
      return;
    }
    const desiredValues = payload.selections ?? [];
    const supplierRecords = items.filter((item) => item.supplierId === supplierId);
    const existingValues = supplierRecords.map((record) => ({
      id: record.id,
      value: record[associationFieldKey] ? String(record[associationFieldKey]) : "",
    }));
    const toAdd = desiredValues.filter(
      (value) => value && !existingValues.some((existing) => existing.value === value),
    );
    const toRemove = existingValues.filter((existing) => existing.value && !desiredValues.includes(existing.value));

    try {
      setModal((prev) => (prev.open ? { ...prev, submitting: true, error: null } : prev));

      await Promise.all(
        toAdd.map(async (value) => {
          const response = await fetch(`/api/admin/collections/${activeConfig.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: { supplierId, [associationFieldKey]: value } }),
          });
          const data = await response.json();
          if (!response.ok || !data?.success) {
            throw new Error(data?.message || "Failed to add association.");
          }
        }),
      );

      await Promise.all(
        toRemove.map(async (record) => {
          const response = await fetch(`/api/admin/collections/${activeConfig.id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: record.id }),
          });
          const data = await response.json();
          if (!response.ok || !data?.success) {
            throw new Error(data?.message || "Failed to remove association.");
          }
        }),
      );

      const message =
        toAdd.length === 0 && toRemove.length === 0
          ? "No association changes detected."
          : "Supplier associations updated.";
      setPanelMessage(message);
      closeModal();
      fetchItems();
    } catch (error: any) {
      console.error("❌ Association save error:", error);
      setModal((prev) =>
        prev.open
          ? {
              ...prev,
              submitting: false,
              error: error?.message || "Failed to save associations.",
            }
          : prev,
      );
    }
  };

  const saveOpenHours = async (payload: {
    supplierId?: string;
    allDay: boolean;
    days: Record<
      string,
      {
        enabled: boolean;
        open: string;
        close: string;
      }
    >;
    note?: string;
  }) => {
    if (!activeConfig) return;
    const supplierId = payload.supplierId?.trim();
    if (!supplierId) {
      setPanelMessage("Select a supplier before saving hours.");
      return;
    }

    try {
      setModal((prev) => (prev.open ? { ...prev, submitting: true, error: null } : prev));
      const supplierRecords = items.filter((item) => item.supplierId === supplierId);

      await Promise.all(
        supplierRecords.map(async (record) => {
          const response = await fetch(`/api/admin/collections/${activeConfig.id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: record.id }),
          });
          const data = await response.json();
          if (!response.ok || !data?.success) {
            throw new Error(data?.message || "Failed to remove existing open hours.");
          }
        }),
      );

      if (payload.allDay) {
        const response = await fetch(`/api/admin/collections/${activeConfig.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: {
              supplierId,
              dayOfWeek: "All",
              openTime: "24/7",
              closeTime: "24/7",
              notes: payload.note ?? "",
            },
          }),
        });
        const data = await response.json();
        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Failed to create 24/7 entry.");
        }
      } else {
        const createPromises = DAYS_OF_WEEK.filter((day) => payload.days?.[day]?.enabled).map((day) => {
          const entry = payload.days[day];
          const openTime = entry.open || "";
          const closeTime = entry.close || "";
          return fetch(`/api/admin/collections/${activeConfig.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              data: {
                supplierId,
                dayOfWeek: day,
                openTime,
                closeTime,
                notes: payload.note ?? "",
              },
            }),
          }).then(async (response) => {
            const responseBody = await response.json();
            if (!response.ok || !responseBody?.success) {
              throw new Error(responseBody?.message || `Failed to save hours for ${day}.`);
            }
          });
        });
        await Promise.all(createPromises);
      }

      setPanelMessage("Open hours updated.");
      closeModal();
      fetchItems();
    } catch (error: any) {
      console.error("❌ Open hours save error:", error);
      setModal((prev) =>
        prev.open
          ? {
              ...prev,
              submitting: false,
              error: error?.message || "Failed to save open hours.",
            }
          : prev,
      );
    }
  };

  const normalizeAssociationValues = (values?: string[]): string[] => {
    if (!Array.isArray(values)) {
      return [];
    }
    return Array.from(
      new Set(
        values
          .map((value) => (typeof value === "string" ? value.trim() : ""))
          .filter((value) => value.length > 0),
      ),
    );
  };

  const handleSubmit = async (payload?: any) => {
    if (!modal.open || !activeConfig) return;

    if (payload?.type === "association") {
      await saveAssociationSelections(payload);
      return;
    }

    if (payload?.type === "openHours") {
      await saveOpenHours(payload);
      return;
    }

    setModal((prev) => (prev.open ? { ...prev, submitting: true, error: null } : prev));

    const formData: Record<string, unknown> = {};
    activeConfig.fields.forEach((field) => {
      const value = modal.formValues[field.key];
      if (field.widget === "multi-select") {
        if (Array.isArray(value)) {
          formData[field.key] = value.map((item) => String(item));
        } else if (typeof value === "string" && value.length > 0) {
          formData[field.key] = [value];
        } else {
          formData[field.key] = [];
        }
      } else if (field.type === "boolean" || field.widget === "checkbox") {
        formData[field.key] = Boolean(value);
      } else {
        formData[field.key] = value ?? "";
      }
    });

    const requestBody: Record<string, unknown> = { data: formData };
    if (modal.mode === "edit") {
      requestBody.id = modal.docId;
    }

    const desiredSupplierAssociations =
      activeConfig.id === SUPPLIER_COLLECTION_ID
        ? {
            categories: Array.isArray(modal.formValues[SUPPLIER_CATEGORY_FORM_KEY])
              ? (modal.formValues[SUPPLIER_CATEGORY_FORM_KEY] as string[])
              : [],
            offerings: Array.isArray(modal.formValues[SUPPLIER_OFFERING_FORM_KEY])
              ? (modal.formValues[SUPPLIER_OFFERING_FORM_KEY] as string[])
              : [],
            products: Array.isArray(modal.formValues[SUPPLIER_PRODUCT_FORM_KEY])
              ? (modal.formValues[SUPPLIER_PRODUCT_FORM_KEY] as string[])
              : [],
          }
        : null;

    try {
      if (activeConfig.id === SUPPLIER_COLLECTION_ID && modal.mode === "edit") {
        const supplierId = modal.docId;
        if (!supplierId) {
          throw new Error("Missing supplier ID for update.");
        }

        const updates: Record<string, unknown> = {};
        Object.entries(formData).forEach(([key, value]) => {
          if (
            key === SUPPLIER_CATEGORY_FORM_KEY ||
            key === SUPPLIER_OFFERING_FORM_KEY ||
            key === SUPPLIER_PRODUCT_FORM_KEY
          ) {
            return;
          }
          if (key.includes(".")) {
            assignNestedValue(updates, key, value);
          } else {
            updates[key] = value;
          }
        });

        if (desiredSupplierAssociations) {
          const normalizedCategories = normalizeAssociationValues(desiredSupplierAssociations.categories);
          const normalizedOfferings = normalizeAssociationValues(desiredSupplierAssociations.offerings);
          const normalizedProducts = normalizeAssociationValues(desiredSupplierAssociations.products);
          updates.category = normalizedCategories[0] ?? null;
          updates.categories = normalizedCategories;
          updates.offerings = normalizedOfferings;
          updates.products = normalizedProducts;
        }

        const response = await fetch("/api/admin/updateSupplier", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: supplierId, updates }),
        });
        const data = await response.json();
        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Failed to update supplier.");
        }

        await syncSupplierAssociations(
          supplierId,
          desiredSupplierAssociations ?? { categories: [], offerings: [], products: [] },
          modal.associations ?? { categories: [], offerings: [], products: [] },
        );
        setPanelMessage("Supplier updated.");
        closeModal();
        fetchItems();
        return;
      }

      if (modal.mode === "create" && ASSOCIATION_COLLECTIONS.has(activeConfig.id)) {
        const fanOutField = activeConfig.fields.find((field) => field.widget === "multi-select");
        const anchorField = activeConfig.fields.find((field) => field.widget !== "multi-select");
        const selections = fanOutField
          ? (Array.isArray(formData[fanOutField.key]) ? (formData[fanOutField.key] as string[]) : [])
          : [];
        if (!anchorField || !fanOutField) {
          throw new Error("Association configuration missing fields.");
        }
        if (selections.length === 0) {
          throw new Error("Select at least one item before saving.");
        }
        const basePayload: Record<string, unknown> = {};
        Object.entries(formData).forEach(([key, value]) => {
          if (key !== fanOutField.key) {
            basePayload[key] = value;
          }
        });
        for (const option of selections) {
          const response = await fetch(`/api/admin/collections/${activeConfig.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: { ...basePayload, [fanOutField.key]: option } }),
          });
          const data = await response.json();
          if (!response.ok || !data?.success) {
            throw new Error(data?.message || "Save failed.");
          }
        }
        console.log(`💾 Saved ${selections.length} ${activeConfig.label} records`);
        setPanelMessage(`${selections.length} ${activeConfig.label.toLowerCase()} added.`);
        closeModal();
        fetchItems();
        return;
      }

      if (modal.mode === "edit" && ASSOCIATION_COLLECTIONS.has(activeConfig.id)) {
        const fanOutField = activeConfig.fields.find((field) => field.widget === "multi-select");
        if (fanOutField && Array.isArray(formData[fanOutField.key])) {
          const selections = formData[fanOutField.key] as string[];
          formData[fanOutField.key] = selections[0] ?? "";
        }
      }

      const response = await fetch(`/api/admin/collections/${activeConfig.id}`, {
        method: modal.mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Save failed.");
      }
      console.log(`💾 Saved ${activeConfig.label} record`, data.item?.id ?? "");
      if (activeConfig.id === SUPPLIER_COLLECTION_ID) {
        const supplierId = modal.mode === "edit" ? modal.docId : data?.item?.id;
        if (!supplierId) {
          throw new Error("Unable to resolve supplier ID for association updates.");
        }
        await syncSupplierAssociations(
          supplierId,
          desiredSupplierAssociations ?? { categories: [], offerings: [], products: [] },
          modal.associations ?? { categories: [], offerings: [], products: [] },
        );
        setPanelMessage("Supplier associations updated.");
      }
      closeModal();
      fetchItems();
    } catch (err: any) {
      console.error("❌ Maintenance save error:", err);
      setModal((prev) =>
        prev.open
          ? {
              ...prev,
              submitting: false,
              error: err?.message || "Save failed.",
            }
          : prev,
      );
    }
  };

  const handleAddClick = () => {
    if (!activeConfig) return;
    openModal("create");
  };

  const handleEditClick = () => {
    if (!activeConfig) return;
    if (!selectedRecord && !(isAssociationCollection || isOpenHoursCollection)) {
      setPanelMessage("Select a record before clicking Edit.");
      return;
    }
    openModal("edit", selectedRecord ?? undefined);
  };

  const handleDeleteClick = async () => {
    if (!activeConfig) return;
    if (!selectedRecord) {
      setPanelMessage("Select a record before clicking Delete.");
      return;
    }
    let payload: Record<string, unknown> = { id: selectedRecord.id };
    if (activeConfig.id === SUPPLIER_COLLECTION_ID) {
      const proceed = window.confirm(
        "Deleting a supplier will remove related category/offering/product links. Continue?",
      );
      if (!proceed) {
        return;
      }
      const code = window.prompt("Enter the 4-digit delete confirmation code to proceed:");
      if (code?.trim() !== SUPPLIER_DELETE_CONFIRMATION_CODE) {
        setPanelMessage("Delete cancelled — confirmation code did not match.");
        return;
      }
      payload = { ...payload, code: code.trim() };
    } else if (!window.confirm("Delete this record? This action cannot be undone.")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/collections/${activeConfig.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Delete failed.");
      }
      console.log(`🗑️ Deleted ${activeConfig.label} record`, selectedRecord.id);
      setPanelMessage(`${activeConfig.label} record deleted.`);
      setSelectedId(null);
      await fetchItems();
    } catch (err: any) {
      console.error("❌ Maintenance delete error:", err);
      setPanelMessage(err?.message || "Delete failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex h-full flex-col rounded-lg bg-white p-4 shadow">
      <header className="mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Database Maintenance</h2>
        <p className="text-sm text-gray-500">
          Browse and maintain reference collections. Use the Add button for new records or Edit to update and delete.
        </p>
      </header>

      <div className="flex flex-1 gap-4 overflow-hidden">
        <nav
          aria-label="Collections"
          className="max-h-full w-full max-w-[220px] overflow-y-auto rounded-lg border border-gray-200"
        >
          <ul>
            {maintenanceCollections.map((collection) => {
              const isActive = collection.id === activeCollectionId;
              return (
                <li key={collection.id}>
                  <button
                    type="button"
                    onClick={() => setActiveCollectionId(collection.id)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                      isActive
                        ? "border-l-4 border-blue-500 bg-blue-50 font-semibold text-blue-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>{collection.label}</span>
                    {isActive && (
                      <span className="text-xs uppercase text-blue-500">Active</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-gray-200">
          {activeConfig ? (
            <>
              <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
                <div className="min-w-[200px]">
                  <h3 className="text-lg font-semibold text-gray-800">{activeConfig.label}</h3>
                  <p className="text-xs text-gray-500">{activeConfig.description}</p>
                </div>
                <div className="flex flex-1 items-center justify-center">
                  <input
                    type="search"
                    className="w-full max-w-sm rounded border border-gray-300 px-3 py-2 text-sm"
                    placeholder={`Search ${activeConfig.label.toLowerCase()}…`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Link
                    href="/admin/validation-report"
                    className="rounded border border-teal-500 px-3 py-1.5 text-sm font-semibold text-teal-600 transition hover:bg-teal-50"
                  >
                    Validation Report
                  </Link>
                </div>
              </div>

              <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 overflow-auto">
                  {loading ? (
                    <div className="p-6 text-center text-gray-500">Loading {activeConfig.label}…</div>
                  ) : error ? (
                    <div className="p-6 text-center text-red-600">{error}</div>
                  ) : filteredItems.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      {debouncedSearch
                        ? `No ${activeConfig.label.toLowerCase()} match "${debouncedSearch}".`
                        : `No ${activeConfig.label.toLowerCase()} found.`}
                    </div>
                  ) : (
                    <table className="min-w-full border-t border-gray-200 text-sm">
                      <thead className="bg-gray-100 text-left text-xs uppercase text-gray-600">
                        <tr>
                          <th className="px-3 py-2">ID</th>
                          {activeConfig.fields.map((field) => (
                            <th key={field.key} className="px-3 py-2">
                              {field.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredItems.map((item) => {
                          const isSelected = item.id === selectedId;
                          return (
                            <tr
                              key={item.id}
                              tabIndex={0}
                              onClick={() => {
                                setSelectedId(item.id);
                                setPanelMessage(null);
                              }}
                              onDoubleClick={() => {
                                setSelectedId(item.id);
                                openModal("edit", item);
                              }}
                              className={`border-b border-gray-100 transition ${
                                isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                              }`}
                            >
                              <td className="px-3 py-2 font-mono text-xs text-gray-600">{item.id}</td>
                              {activeConfig.fields.map((field) => (
                                <td key={field.key} className="px-3 py-2 align-top text-gray-700">
                                  {fieldDisplay(field, getValueByPath(item, field.key)) || (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="flex w-32 flex-col items-stretch justify-start gap-3 border-l border-gray-200 bg-gray-50 p-3">
                  <button
                    type="button"
                    className={`rounded px-3 py-2 text-sm font-semibold text-white transition ${
                      isAssociationCollection || isOpenHoursCollection
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                    onClick={handleAddClick}
                    disabled={loading || isAssociationCollection || isOpenHoursCollection}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    className={`rounded px-3 py-2 text-sm font-semibold text-white transition ${
                      loading || (requiresRowSelection && !selectedRecord)
                        ? "bg-indigo-300 cursor-not-allowed"
                        : "bg-indigo-500 hover:bg-indigo-600"
                    }`}
                    onClick={handleEditClick}
                    disabled={loading || (requiresRowSelection && !selectedRecord)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={`rounded px-3 py-2 text-sm font-semibold text-white transition ${
                      isAssociationCollection || isOpenHoursCollection
                        ? "bg-gray-400 cursor-not-allowed"
                        : loading || (requiresRowSelection && !selectedRecord)
                        ? "bg-red-300 cursor-not-allowed"
                        : "bg-red-500 hover:bg-red-600"
                    }`}
                    onClick={handleDeleteClick}
                    disabled={
                      loading ||
                      isAssociationCollection ||
                      isOpenHoursCollection ||
                      (requiresRowSelection && !selectedRecord)
                    }
                  >
                    Delete
                  </button>
                  {loadingReference && (
                    <p className="text-center text-[11px] text-gray-500">Loading lookup data…</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-gray-500">
              Select a collection to begin.
            </div>
          )}
        </div>
      </div>

      {panelMessage && (
        <div className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {panelMessage}
        </div>
      )}

      {modal.open && activeConfig && (
        <MaintenanceModal
          key={`${modal.mode}-${modal.docId ?? "new"}`}
          config={activeConfig}
          state={modal}
          onClose={closeModal}
          onChange={handleFormChange}
          onBulkChange={handleBulkChange}
          onSubmit={handleSubmit}
          zipLookup={zipLookup}
          resolveOptions={resolveOptions}
          collectionItems={items}
          referenceData={referenceData}
        />
      )}
    </section>
  );
};

interface MaintenanceModalProps {
  config: MaintenanceCollectionConfig;
  state: Exclude<ModalState, { open: false }>;
  onClose: () => void;
  onChange: (key: string, value: string | boolean | string[]) => void;
  onBulkChange: (entries: Record<string, string | string[]>) => void;
  onSubmit: (payload?: any) => void;
  zipLookup: Map<string, { regionId: string; state: string }>;
  resolveOptions: (source?: OptionSource) => Array<{ value: string; label: string }>;
  collectionItems: MaintenanceRecord[];
  referenceData: {
    categories: Array<{ id: string; name: string }>;
    offerings: Array<{ id: string; name: string }>;
    products: Array<{ id: string; name: string }>;
    regions: Array<{ id: string; name?: string }>;
    suppliers: Array<{ id: string; name: string }>;
  };
}

const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  config,
  state,
  onClose,
  onChange,
  onBulkChange,
  onSubmit,
  zipLookup,
  resolveOptions,
  collectionItems,
  referenceData,
}) => {
  const lastAutoZipRef = useRef("");

  const previewDocumentId =
    state.mode === "create" && config.idFromField
      ? createDocumentIdPreview(state.formValues[config.idFromField])
      : null;

  const isAssociationModal = ASSOCIATION_COLLECTIONS.has(config.id);
  const isOpenHoursModal = config.id === "openHours";
  const isSupplierModal = config.id === SUPPLIER_COLLECTION_ID;
  const associationField = isAssociationModal
    ? config.fields.find((field) => field.key !== "supplierId")
    : null;

  const renderFieldControl = (field: FieldConfig) => {
    const currentValue = state.formValues[field.key];
    let options = resolveOptions(field.optionsSource);
    if (
      typeof currentValue === "string" &&
      currentValue.length > 0 &&
      !options.some((option) => option.value === currentValue)
    ) {
      options = [{ value: currentValue, label: currentValue }, ...options];
    }

    switch (field.widget) {
      case "checkbox":
        return (
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={Boolean(currentValue)}
              onChange={(e) => onChange(field.key, e.target.checked)}
            />
            <span>Enabled</span>
          </label>
        );
      case "select":
      case "time": {
        const value = typeof currentValue === "string" ? currentValue : "";
        return (
          <select
            className="rounded border border-gray-300 px-3 py-2 text-sm"
            value={value}
            onChange={(e) => onChange(field.key, e.target.value)}
          >
            <option value="">Select…</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      }
      case "multi-select": {
        const selected = Array.isArray(currentValue) ? currentValue : [];
        return (
          <div className="flex max-h-36 flex-col gap-1 overflow-y-auto rounded border border-gray-200 p-2">
            {options.length === 0 && (
              <span className="text-xs text-gray-400">No options available.</span>
            )}
            {options.map((option) => {
              const checked = selected.includes(option.value);
              return (
                <label key={option.value} className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...selected, option.value]
                        : selected.filter((value) => value !== option.value);
                      onChange(field.key, next);
                    }}
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        );
      }
      case "textarea":
        return (
          <textarea
            className="min-h-[96px] rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder={field.placeholder || ""}
            value={String(currentValue ?? "")}
            onChange={(e) => onChange(field.key, e.target.value)}
          />
        );
      case "code":
        return (
          <input
            type="text"
            className="rounded border border-gray-200 bg-gray-100 px-3 py-2 text-sm font-mono text-gray-600"
            value={
              typeof currentValue === "string" && currentValue.length > 0
                ? currentValue
                : (previewDocumentId ? previewDocumentId.toLowerCase() : "")
            }
            readOnly
          />
        );
      default: {
        if (field.type === "json") {
          return (
            <textarea
              className="min-h-[120px] rounded border border-gray-300 px-3 py-2 font-mono text-xs"
              placeholder={field.placeholder || "{ }"}
              value={String(currentValue ?? "")}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          );
        }
        if (field.type === "stringArray") {
          return (
            <textarea
              className="min-h-[96px] rounded border border-gray-300 px-3 py-2 text-sm"
              placeholder={field.placeholder || "One value per line"}
              value={String(currentValue ?? "")}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          );
        }
        return (
          <input
            type={field.type === "number" ? "number" : "text"}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder={field.placeholder || ""}
            value={String(currentValue ?? "")}
            onChange={(e) => onChange(field.key, e.target.value)}
          />
        );
      }
    }
  };

  const renderFieldBlock = (field: FieldConfig) => (
    <div key={field.key} className="flex flex-col gap-1 text-sm text-gray-700">
      <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
        {field.label}
        {field.required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {renderFieldControl(field)}
      {field.description && (
        <p className="text-xs text-gray-500">{field.description}</p>
      )}
    </div>
  );

  const renderSupplierAssociationsPanel = () => (
    <div className="w-full rounded border border-gray-200 bg-gray-50 p-3 lg:w-[360px] xl:w-[420px]">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
        Supplier Associations
      </h4>
      <div className="grid gap-3 md:grid-cols-3 md:gap-2 lg:grid-cols-1">
        {[
          {
            title: "Categories",
            key: SUPPLIER_CATEGORY_FORM_KEY,
            options: resolveOptions("categories"),
          },
          {
            title: "Offerings",
            key: SUPPLIER_OFFERING_FORM_KEY,
            options: resolveOptions("offerings"),
          },
          {
            title: "Products",
            key: SUPPLIER_PRODUCT_FORM_KEY,
            options: resolveOptions("products"),
          },
        ].map(({ title, key, options }) => {
          const selected = Array.isArray(state.formValues[key])
            ? (state.formValues[key] as string[])
            : [];
          return (
            <div key={key} className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{title}</p>
              <div className="max-h-[520px] overflow-y-auto rounded border border-gray-200 bg-white p-2">
                {options.length === 0 && (
                  <span className="text-xs text-gray-400">No {title.toLowerCase()} available.</span>
                )}
                {options.map((option) => {
                  const checked = selected.includes(option.value);
                  return (
                    <label key={option.value} className="flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...selected, option.value]
                            : selected.filter((value) => value !== option.value);
                          onChange(key, next);
                        }}
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const [associationSupplierId, setAssociationSupplierId] = useState(
    isAssociationModal ? (state.formValues["supplierId"] as string) ?? "" : "",
  );
  const [associationSelection, setAssociationSelection] = useState<string[]>(
    isAssociationModal && associationField && Array.isArray(state.formValues[associationField.key])
      ? (state.formValues[associationField.key] as string[])
      : [],
  );

  const buildOpenHoursState = useCallback(
    (supplierId: string) => {
      const base: Record<string, DayState> = {};
      DAYS_OF_WEEK.forEach((day) => {
        base[day] = { enabled: false, open: "09:00am", close: "05:00pm" };
      });
      let note = "";
      let allDay = false;

      const supplierRecords = collectionItems.filter((item) => item.supplierId === supplierId);
      supplierRecords.forEach((record) => {
        const day: string =
          (typeof record.dayOfWeek === "string" && record.dayOfWeek.length > 0
            ? record.dayOfWeek
            : typeof record["day"] === "string"
            ? (record["day"] as string)
            : "") || "";
        const openTime: string = typeof record.openTime === "string" ? record.openTime : "";
        const closeTime: string = typeof record.closeTime === "string" ? record.closeTime : "";
        if ((openTime === "24/7" && closeTime === "24/7") || day === "All") {
          allDay = true;
        } else if (base[day]) {
          base[day] = {
            enabled: true,
            open: openTime || "09:00am",
            close: closeTime || "05:00pm",
            hadExisting: true,
          };
        }
        if (!note && typeof record.notes === "string" && record.notes.length > 0) {
          note = record.notes;
        }
      });

      return { base, note, allDay };
    },
    [collectionItems],
  );

  const initialOpenHoursSupplier = isOpenHoursModal
    ? (state.formValues["supplierId"] as string) || referenceData.suppliers[0]?.id || ""
    : "";
  const initialOpenHours = isOpenHoursModal
    ? buildOpenHoursState(initialOpenHoursSupplier)
    : { base: {} as Record<string, DayState>, note: "", allDay: false };
  const [openHoursSupplierId, setOpenHoursSupplierId] = useState(initialOpenHoursSupplier);
  const [openHoursDays, setOpenHoursDays] = useState<Record<string, DayState>>(initialOpenHours.base);
  const [openHoursNote, setOpenHoursNote] = useState(initialOpenHours.note);
  const [openHoursAllDay, setOpenHoursAllDay] = useState(initialOpenHours.allDay);

  useEffect(() => {
    if (config.id !== SUPPLIER_COLLECTION_ID || state.mode !== "create") {
      return;
    }
    const rawZip = state.formValues["address.zip"];
    if (typeof rawZip !== "string" && typeof rawZip !== "number") {
      return;
    }
    const normalizedZip = normalizeZip(rawZip);
    if (!normalizedZip || normalizedZip === lastAutoZipRef.current) {
      return;
    }
    const match = zipLookup.get(normalizedZip);
    if (!match) {
      return;
    }
    lastAutoZipRef.current = normalizedZip;
    const currentRegion = String(state.formValues["address.regionId"] ?? "");
    const currentState = String(state.formValues["address.state"] ?? "");
    if (currentRegion !== match.regionId || currentState !== match.state) {
      onBulkChange({
        "address.regionId": match.regionId,
        "address.state": match.state,
      });
    }
  }, [config.id, state.mode, state.formValues, zipLookup, onBulkChange]);


  const handleSaveClick = () => {
    if (isAssociationModal) {
      onSubmit({
        type: "association",
        supplierId: associationSupplierId,
        selections: associationSelection,
      });
      return;
    }
    if (isOpenHoursModal) {
      onSubmit({
        type: "openHours",
        supplierId: openHoursSupplierId,
        allDay: openHoursAllDay,
        days: openHoursDays,
        note: openHoursNote,
      });
      return;
    }
    onSubmit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 py-6 sm:items-center">
      <div className="w-full max-w-5xl rounded-lg bg-white shadow-lg">
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h3 className="text-lg font-semibold text-gray-800">
            {state.mode === "create" ? `Add ${config.label} Record` : `Edit ${config.label} Record`}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            ✕
          </button>
        </header>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <dl className="mb-4 grid grid-cols-1 gap-4 text-sm text-gray-600 sm:grid-cols-2">
            <div>
              <dt className="font-semibold uppercase tracking-wide text-xs text-gray-500">Collection</dt>
              <dd>{config.collection}</dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wide text-xs text-gray-500">Document ID</dt>
              <dd className="font-mono text-xs text-gray-700">
                {isAssociationModal || isOpenHoursModal ? (
                  <span className="text-gray-500">Managed per supplier</span>
                ) : state.mode === "edit" ? (
                  state.docId
                ) : (
                  previewDocumentId || <span className="text-gray-400">Auto-generated</span>
                )}
              </dd>
            </div>
          </dl>

          {isSupplierModal ? (
            <div className="flex flex-col gap-6 lg:flex-row">
              <div className="flex-1 lg:flex-[2]">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {config.fields.map((field) => renderFieldBlock(field))}
                </div>
              </div>
              {renderSupplierAssociationsPanel()}
            </div>
          ) : isAssociationModal ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-1 text-sm text-gray-700">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">Supplier</label>
                <select
                  className="rounded border border-gray-300 px-3 py-2 text-sm"
                  value={associationSupplierId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setAssociationSupplierId(nextId);
                    if (associationField) {
                      const current = collectionItems
                        .filter((item) => item.supplierId === nextId)
                        .map((item) => String(item[associationField.key]));
                      setAssociationSelection(current);
                    }
                  }}
                >
                  {referenceData.suppliers.length === 0 && <option value="">No suppliers available</option>}
                  {referenceData.suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name || supplier.id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded border border-gray-200 bg-white p-3">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Associations
                </h4>
                <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                  {associationField && resolveOptions(associationField.optionsSource).map((option) => {
                    const checked = associationSelection.includes(option.value);
                    return (
                      <label key={option.value} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setAssociationSelection((prev) =>
                              e.target.checked
                                ? [...prev, option.value]
                                : prev.filter((value) => value !== option.value),
                            );
                          }}
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                  {associationField && resolveOptions(associationField.optionsSource).length === 0 && (
                    <span className="text-xs text-gray-400">No options available.</span>
                  )}
                </div>
              </div>
            </div>
          ) : isOpenHoursModal ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-1 text-sm text-gray-700">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">Supplier</label>
                <select
                  className="rounded border border-gray-300 px-3 py-2 text-sm"
                  value={openHoursSupplierId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setOpenHoursSupplierId(nextId);
                    if (nextId) {
                      const nextState = buildOpenHoursState(nextId);
                      setOpenHoursDays(nextState.base);
                      setOpenHoursNote(nextState.note);
                      setOpenHoursAllDay(nextState.allDay);
                    }
                  }}
                >
                  {referenceData.suppliers.length === 0 && <option value="">No suppliers available</option>}
                  {referenceData.suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name || supplier.id}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={openHoursAllDay}
                  onChange={(e) => {
                    setOpenHoursAllDay(e.target.checked);
                    if (e.target.checked) {
                      setOpenHoursDays((prev) => {
                        const next = { ...prev };
                        Object.keys(next).forEach((day) => {
                          next[day] = { ...next[day], enabled: false };
                        });
                        return next;
                      });
                    }
                  }}
                />
                <span>24/7</span>
              </label>
              <div className="space-y-2">
                {DAYS_OF_WEEK.map((day) => {
                  const entry = openHoursDays[day] || { enabled: false, open: "09:00am", close: "05:00pm" };
                  const disabled = openHoursAllDay;
                  const pendingRemoval = !entry.enabled && entry.hadExisting;
                  return (
                    <div key={day} className={"rounded border px-3 py-2 " + (pendingRemoval ? "border-red-400 bg-red-50" : "border-gray-200 bg-white")}>
                      <div className="flex items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-sm text-gray-800">
                          <input
                            type="checkbox"
                            checked={entry.enabled && !disabled}
                            disabled={disabled}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setOpenHoursDays((prev) => ({
                                ...prev,
                                [day]: { ...prev[day], enabled: checked },
                              }));
                            }}
                          />
                          <span>{day}</span>
                        </label>
                        <div className="flex gap-2">
                          <select
                            className="rounded border border-gray-300 px-2 py-1 text-sm"
                            disabled={!entry.enabled || disabled}
                            value={entry.open}
                            onChange={(e) =>
                              setOpenHoursDays((prev) => ({
                                ...prev,
                                [day]: { ...prev[day], open: e.target.value },
                              }))
                            }
                          >
                            {HALF_HOUR_TIMES.map((time) => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                          <select
                            className="rounded border border-gray-300 px-2 py-1 text-sm"
                            disabled={!entry.enabled || disabled}
                            value={entry.close}
                            onChange={(e) =>
                              setOpenHoursDays((prev) => ({
                                ...prev,
                                [day]: { ...prev[day], close: e.target.value },
                              }))
                            }
                          >
                            {HALF_HOUR_TIMES.map((time) => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {pendingRemoval && (
                        <p className="text-xs text-red-600">Will delete existing hours for {day} on save.</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col gap-1 text-sm text-gray-700">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">Notes</label>
                <textarea
                  className="min-h-[80px] rounded border border-gray-300 px-3 py-2 text-sm"
                  value={openHoursNote}
                  onChange={(e) => setOpenHoursNote(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {config.fields.map((field) => renderFieldBlock(field))}
            </div>
          )}
          {state.error && <p className="mt-4 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{state.error}</p>}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-5 py-3">
          <span className="text-xs text-gray-500">
            {isAssociationModal || isOpenHoursModal
              ? "Use this editor to add or remove mappings; changes apply on Save."
              : state.mode === "edit"
              ? "Adjust fields and press Save. Use the Delete button on the sidebar for removals."
              : (
                <>
                  Required fields marked with <span className="text-red-500">*</span>
                </>
              )}
          </span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              className="rounded border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
              onClick={onClose}
              disabled={state.submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              onClick={handleSaveClick}
              disabled={state.submitting}
            >
              {state.submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AdminMaintenancePanel;
