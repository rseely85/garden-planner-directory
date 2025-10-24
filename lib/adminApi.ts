export interface MissingZipsPayload {
  ids: string[];
  count: number;
}

export async function fetchMissingZips(): Promise<MissingZipsPayload> {
  const response = await fetch("/api/admin/missingZips");
  if (!response.ok) {
    throw new Error(`Failed to fetch missing ZIPs: ${response.status}`);
  }
  const data = await response.json();
  const ids = Array.isArray(data?.ids) ? data.ids : [];
  const count = typeof data?.count === "number" ? data.count : ids.length;
  return { ids, count };
}
