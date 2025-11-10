import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "@/lib/firebaseAdmin";
import {
  SUPPLIER_DELETE_CONFIRMATION_CODE,
  coerceFieldValue,
  getCollectionConfig,
  type MaintenanceCollectionConfig,
} from "@/lib/admin/maintenanceMetadata";

type SuccessResponse =
  | { success: true; items: Array<Record<string, unknown>> }
  | { success: true; item: Record<string, unknown> }
  | { success: true; message: string };

type ErrorResponse = { success: false; message: string };

type ApiResponse = SuccessResponse | ErrorResponse;

function parseCollectionId(queryValue: string | string[] | undefined): string | null {
  if (!queryValue) return null;
  if (Array.isArray(queryValue)) {
    return queryValue[0] ?? null;
  }
  return queryValue;
}

function setNestedValue(target: Record<string, unknown>, path: string, value: unknown) {
  const segments = path.split(".");
  let cursor: Record<string, unknown> = target;
  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
      cursor[segment] = value;
      return;
    }
    const next = cursor[segment];
    if (typeof next === "object" && next !== null && !Array.isArray(next)) {
      cursor = next as Record<string, unknown>;
    } else {
      const newLayer: Record<string, unknown> = {};
      cursor[segment] = newLayer;
      cursor = newLayer;
    }
  });
}

function getValueByPath(source: Record<string, unknown>, path: string): unknown {
  const segments = path.split(".");
  let cursor: any = source;
  for (const segment of segments) {
    if (cursor === null || cursor === undefined) {
      return undefined;
    }
    cursor = cursor[segment];
  }
  return cursor;
}

function createDocumentId(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const cleaned = trimmed
    .replace(/[^A-Za-z0-9\s_-]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || null;
}

function buildPayload(config: MaintenanceCollectionConfig, input: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};
  const errors: string[] = [];

  config.fields.forEach((field) => {
    const rawValue = input[field.key];
    const hasValue = rawValue !== undefined && rawValue !== null && rawValue !== "";
    if (!hasValue && field.required && field.defaultValue === undefined) {
      errors.push(`${field.label || field.key} is required.`);
      return;
    }

    const valueToUse = hasValue ? rawValue : field.defaultValue;
    if (valueToUse === undefined) {
      return;
    }

    const coerced = coerceFieldValue(field, valueToUse);
    if (field.key.includes(".")) {
      setNestedValue(payload, field.key, coerced);
    } else {
      payload[field.key] = coerced;
    }
  });

  return { payload, errors };
}

async function handleGet(config: MaintenanceCollectionConfig) {
  const snapshot = await adminDb.collection(config.collection).get();
  const items = snapshot.docs.map((doc) => {
    const data = doc.data() ?? {};
    return { id: doc.id, ...data };
  });

  if (config.primaryField) {
    items.sort((a, b) => {
      const aValue = String(getValueByPath(a, config.primaryField!) ?? "");
      const bValue = String(getValueByPath(b, config.primaryField!) ?? "");
      return aValue.localeCompare(bValue, undefined, { sensitivity: "base" });
    });
  }

  return { success: true, items } as SuccessResponse;
}

async function handlePost(config: MaintenanceCollectionConfig, body: any) {
  const data = (body && typeof body === "object" ? body.data : null) as Record<string, unknown> | null;
  if (!data) {
    return { success: false, message: "Request body must include a data object." } as ErrorResponse;
  }

  const { payload, errors } = buildPayload(config, data);
  if (errors.length > 0) {
    return { success: false, message: errors.join(" ") } as ErrorResponse;
  }

  const explicitId = typeof body.id === "string" && body.id.trim().length > 0 ? body.id.trim() : null;
  const collectionRef = adminDb.collection(config.collection);

  let documentId = explicitId;
  if (!documentId && config.idFromField) {
    documentId = createDocumentId(getValueByPath(payload, config.idFromField));
  }
  if (!documentId) {
    documentId = collectionRef.doc().id;
  }

  if (config.id === "suppliers") {
    const nameSource = getValueByPath(payload, "name");
    if (!getValueByPath(payload, "slug") && typeof nameSource === "string") {
      const slugCandidate = createDocumentId(nameSource);
      if (slugCandidate) {
        setNestedValue(payload, "slug", slugCandidate.toLowerCase());
      }
    }
  }

  const docRef = collectionRef.doc(documentId);
  await docRef.set(payload, { merge: false });

  return {
    success: true,
    item: { id: docRef.id, ...payload },
  } as SuccessResponse;
}

async function handlePut(config: MaintenanceCollectionConfig, body: any) {
  const docId = typeof body?.id === "string" ? body.id.trim() : "";
  if (!docId) {
    return { success: false, message: "Missing document id." } as ErrorResponse;
  }

  const data = body?.data as Record<string, unknown> | undefined;
  if (!data || typeof data !== "object") {
    return { success: false, message: "Request body must include a data object." } as ErrorResponse;
  }

  const { payload, errors } = buildPayload(config, data);
  if (errors.length > 0) {
    return { success: false, message: errors.join(" ") } as ErrorResponse;
  }

  const docRef = adminDb.collection(config.collection).doc(docId);
  await docRef.set(payload, { merge: true });

  return {
    success: true,
    item: { id: docId, ...payload },
  } as SuccessResponse;
}

async function handleDelete(config: MaintenanceCollectionConfig, body: any) {
  const docId = typeof body?.id === "string" ? body.id.trim() : "";
  if (!docId) {
    return { success: false, message: "Missing document id." } as ErrorResponse;
  }

  if (config.id === "suppliers") {
    const supplierRef = adminDb.collection("suppliers").doc(docId);
    const batch = adminDb.batch();
    batch.delete(supplierRef);

    const linkCollections = [
      { collection: "supplierCategories", field: "supplierId" },
      { collection: "supplierOfferings", field: "supplierId" },
      { collection: "supplierProducts", field: "supplierId" },
    ] as const;

    for (const { collection, field } of linkCollections) {
      const snapshot = await adminDb.collection(collection).where(field, "==", docId).get();
      snapshot.forEach((doc) => batch.delete(doc.ref));
    }

    await batch.commit();
    return { success: true, message: "Supplier and related records deleted." } as SuccessResponse;
  }

  await adminDb.collection(config.collection).doc(docId).delete();
  return { success: true, message: "Document deleted." } as SuccessResponse;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  const collectionId = parseCollectionId(req.query.collectionId);
  if (!collectionId) {
    return res.status(400).json({ success: false, message: "Missing collection id." });
  }

  const config = getCollectionConfig(collectionId);
  if (!config) {
    return res.status(404).json({ success: false, message: `Collection ${collectionId} is not available.` });
  }

  try {
    switch (req.method) {
      case "GET": {
        const response = await handleGet(config);
        return res.status(200).json(response);
      }
      case "POST": {
        const response = await handlePost(config, req.body);
        if (!response.success) {
          return res.status(400).json(response);
        }
        return res.status(201).json(response);
      }
      case "PUT": {
        const response = await handlePut(config, req.body);
        if (!response.success) {
          return res.status(400).json(response);
        }
        return res.status(200).json(response);
      }
      case "DELETE": {
        if (config.id === "suppliers") {
          const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
          if (code !== SUPPLIER_DELETE_CONFIRMATION_CODE) {
            return res.status(400).json({ success: false, message: "Invalid delete confirmation code." });
          }
        }
        const response = await handleDelete(config, req.body);
        if (!response.success) {
          return res.status(400).json(response);
        }
        return res.status(200).json(response);
      }
      default:
        res.setHeader("Allow", "GET,POST,PUT,DELETE");
        return res.status(405).json({ success: false, message: "Method not allowed." });
    }
  } catch (error: any) {
    console.error(`🔥 admin collections error (${collectionId}):`, error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Admin collection request failed.",
    });
  }
}
