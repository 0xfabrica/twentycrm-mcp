import axios, { AxiosError, type Method } from "axios";
import {
  destructiveOperationsEnabled,
  writableEntities,
  type EntityName
} from "./constants.js";

export type JsonObject = Record<string, unknown>;

interface RequestOptions {
  method?: Method;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  timeoutMs?: number;
}

function apiBaseUrl(): string {
  const raw = process.env.TWENTY_API_URL?.trim().replace(/\/+$/, "");
  if (!raw) {
    throw new Error(
      "TWENTY_API_URL is missing. Set it to your Twenty REST root, for example https://crm.example.com/rest."
    );
  }
  const parsed = new URL(raw);
  const local = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !local && process.env.TWENTY_ALLOW_INSECURE_HTTP !== "true") {
    throw new Error("TWENTY_API_URL must use HTTPS unless it targets localhost");
  }
  if (/\/core$/i.test(parsed.pathname)) {
    throw new Error("TWENTY_API_URL must end at /rest, not /rest/core");
  }
  return raw;
}

function apiKey(): string {
  const key = process.env.TWENTY_API_KEY?.trim();
  if (!key) {
    throw new Error("TWENTY_API_KEY is missing. Create a workspace-scoped token in Twenty Settings > API & Webhooks.");
  }
  return key;
}

function entityPath(entity: EntityName, suffix = ""): string {
  return `/${encodeURIComponent(entity)}${suffix}`;
}

function assertWritable(entity: EntityName): void {
  if (!writableEntities().has(entity)) {
    throw new Error(
      `Writes to ${entity} are disabled. Add it to TWENTY_WRITABLE_ENTITIES only after reviewing its schema.`
    );
  }
}

function assertDestructiveEnabled(operation: string): void {
  if (!destructiveOperationsEnabled()) {
    throw new Error(
      `${operation} is disabled. Set TWENTY_ALLOW_DESTRUCTIVE=true for the MCP process only when intentionally needed.`
    );
  }
}

async function request(path: string, options: RequestOptions = {}): Promise<JsonObject> {
  const response = await axios.request<JsonObject>({
    method: options.method || "GET",
    url: `${apiBaseUrl()}${path}`,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    params: options.query,
    data: options.body,
    timeout: options.timeoutMs || 30_000,
    maxContentLength: 5_000_000,
    maxBodyLength: 1_000_000
  });
  return response.data;
}

export function apiErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    if (status === 400) return "Twenty rejected the request (400). Check field names, filter syntax, and object schema.";
    if (status === 401) return "Twenty authentication failed (401). Rotate or replace TWENTY_API_KEY.";
    if (status === 403) return "Twenty denied this operation (403). Check the API key role and object permissions.";
    if (status === 404) return "Twenty could not find the record or endpoint (404). Check the entity and UUID.";
    if (status === 429) return "Twenty rate-limited the request (429). Wait and retry with a smaller batch.";
    if (error.code === "ECONNABORTED") return "The Twenty request timed out after 30 seconds.";
    return `Twenty request failed${status ? ` (${status})` : ""}: ${error.message}`;
  }
  return error instanceof Error ? error.message : "Unexpected Twenty CRM error";
}

export interface ListInput {
  filter?: string;
  order_by?: string;
  limit: number;
  depth: 0 | 1;
  starting_after?: string;
  ending_before?: string;
}

export function listRecords(entity: EntityName, input: ListInput): Promise<JsonObject> {
  return request(entityPath(entity), {
    query: {
      filter: input.filter,
      order_by: input.order_by,
      limit: input.limit,
      depth: input.depth,
      starting_after: input.starting_after,
      ending_before: input.ending_before
    }
  });
}

export function getRecord(entity: EntityName, id: string, depth: 0 | 1): Promise<JsonObject> {
  return request(entityPath(entity, `/${encodeURIComponent(id)}`), { query: { depth } });
}

export function createRecord(entity: EntityName, data: JsonObject, upsert: boolean, depth: 0 | 1): Promise<JsonObject> {
  assertWritable(entity);
  return request(entityPath(entity), { method: "POST", query: { upsert, depth }, body: data });
}

export function updateRecord(entity: EntityName, id: string, data: JsonObject, depth: 0 | 1): Promise<JsonObject> {
  assertWritable(entity);
  return request(entityPath(entity, `/${encodeURIComponent(id)}`), {
    method: "PATCH",
    query: { depth },
    body: data
  });
}

export function softDeleteRecord(entity: EntityName, id: string): Promise<JsonObject> {
  assertWritable(entity);
  assertDestructiveEnabled("Soft delete");
  return request(entityPath(entity, `/${encodeURIComponent(id)}`), {
    method: "DELETE",
    query: { soft_delete: true }
  });
}

export function batchCreateRecords(entity: EntityName, data: JsonObject[]): Promise<JsonObject> {
  assertWritable(entity);
  return request(`/batch/${encodeURIComponent(entity)}`, { method: "POST", body: data, timeoutMs: 60_000 });
}

export function batchUpdateRecords(entity: EntityName, filter: string, data: JsonObject, depth: 0 | 1): Promise<JsonObject> {
  assertWritable(entity);
  return request(entityPath(entity), { method: "PATCH", query: { filter, depth }, body: data });
}

export function batchSoftDeleteRecords(entity: EntityName, filter: string): Promise<JsonObject> {
  assertWritable(entity);
  assertDestructiveEnabled("Batch soft delete");
  return request(entityPath(entity), { method: "DELETE", query: { filter, soft_delete: true } });
}

export function findDuplicates(entity: EntityName, input: { ids?: string[]; data?: JsonObject[] }): Promise<JsonObject> {
  return request(entityPath(entity, "/duplicates"), { method: "POST", body: input });
}

export function groupRecords(entity: EntityName, input: {
  group_by: string;
  aggregate?: string;
  filter?: string;
  limit: number;
  include_records_sample: boolean;
}): Promise<JsonObject> {
  return request(entityPath(entity, "/groupBy"), { query: input });
}

export function mergeRecords(entity: EntityName, ids: string[], conflictPriorityIndex: number, dryRun: boolean): Promise<JsonObject> {
  assertWritable(entity);
  if (!dryRun) assertDestructiveEnabled("Merge");
  return request(entityPath(entity, "/merge"), {
    method: "PATCH",
    body: { ids, conflictPriorityIndex, dryRun }
  });
}

export function restoreRecord(entity: EntityName, id: string, depth: 0 | 1): Promise<JsonObject> {
  assertWritable(entity);
  return request(`/restore/${encodeURIComponent(entity)}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    query: { depth }
  });
}

export function restoreManyRecords(entity: EntityName, filter: string, depth: 0 | 1): Promise<JsonObject> {
  assertWritable(entity);
  return request(`/restore/${encodeURIComponent(entity)}`, { method: "PATCH", query: { filter, depth } });
}
