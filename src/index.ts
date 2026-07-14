#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CHARACTER_LIMIT, ENTITIES } from "./constants.js";
import {
  apiErrorMessage,
  batchCreateRecords,
  batchSoftDeleteRecords,
  batchUpdateRecords,
  createRecord,
  findDuplicates,
  getRecord,
  groupRecords,
  listRecords,
  mergeRecords,
  restoreManyRecords,
  restoreRecord,
  softDeleteRecord,
  updateRecord,
  type JsonObject
} from "./client.js";
import {
  batchCreateSchema,
  batchSoftDeleteSchema,
  batchUpdateSchema,
  createSchema,
  duplicatesSchema,
  getSchema,
  groupBySchema,
  listSchema,
  mergeSchema,
  restoreManySchema,
  restoreSchema,
  searchSchema,
  softDeleteSchema,
  updateSchema
} from "./schemas.js";

const server = new McpServer(
  { name: "twentycrm-mcp-server", version: "0.1.1" },
  {
    instructions:
      "Use Twenty as the CRM system of record. Prefer read-only discovery before writes, use narrow " +
      "filters, and verify record IDs before updates. Soft-delete and real merges are disabled unless " +
      "the operator explicitly enables destructive operations. Core object CRUD does not itself send email."
  }
);

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: JsonObject;
  isError?: boolean;
};

function truncate(text: string): string {
  if (text.length <= CHARACTER_LIMIT) return text;
  return `${text.slice(0, CHARACTER_LIMIT)}\n\n[Truncated. Narrow the filter or lower the limit.]`;
}

function markdownSummary(payload: JsonObject): string {
  const total = typeof payload.totalCount === "number" ? `Total: ${payload.totalCount}\n\n` : "";
  return `${total}\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``;
}

function success(payload: JsonObject, format: "json" | "markdown"): ToolResult {
  const text = format === "markdown" ? markdownSummary(payload) : JSON.stringify(payload, null, 2);
  return { content: [{ type: "text", text: truncate(text) }], structuredContent: payload };
}

function failure(error: unknown): ToolResult {
  return { isError: true, content: [{ type: "text", text: apiErrorMessage(error) }] };
}

async function run(operation: () => Promise<JsonObject>, format: "json" | "markdown"): Promise<ToolResult> {
  try {
    return success(await operation(), format);
  } catch (error) {
    return failure(error);
  }
}

server.registerTool("twenty_list_records", {
  title: "List Twenty CRM records",
  description: "List records from any supported Twenty object with filters, ordering, relation depth, and cursor pagination. Read-only.",
  inputSchema: listSchema,
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
}, (input) => run(() => listRecords(input.entity, input), input.response_format));

server.registerTool("twenty_search_records", {
  title: "Search Twenty CRM records",
  description: "Run a targeted, read-only search using Twenty filter syntax. Prefer this over list when criteria are known.",
  inputSchema: searchSchema,
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
}, (input) => run(() => listRecords(input.entity, input), input.response_format));

server.registerTool("twenty_get_record", {
  title: "Get a Twenty CRM record",
  description: "Fetch one record by object name and UUID. Read-only.",
  inputSchema: getSchema,
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
}, (input) => run(() => getRecord(input.entity, input.id, input.depth), input.response_format));

server.registerTool("twenty_create_record", {
  title: "Create a Twenty CRM record",
  description: "Create one record in an allowed business object. Internal/system objects are read-only by default.",
  inputSchema: createSchema,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
}, (input) => run(() => createRecord(input.entity, input.data, input.upsert, input.depth), input.response_format));

server.registerTool("twenty_update_record", {
  title: "Update a Twenty CRM record",
  description: "Patch one record in an allowed business object by UUID.",
  inputSchema: updateSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true }
}, (input) => run(() => updateRecord(input.entity, input.id, input.data, input.depth), input.response_format));

server.registerTool("twenty_soft_delete_record", {
  title: "Soft-delete a Twenty CRM record",
  description: "Soft-delete one record. Never hard-deletes. Disabled unless TWENTY_ALLOW_DESTRUCTIVE=true.",
  inputSchema: softDeleteSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true }
}, (input) => run(() => softDeleteRecord(input.entity, input.id), input.response_format));

server.registerTool("twenty_batch_create_records", {
  title: "Batch-create Twenty CRM records",
  description: "Create 1-50 records in an allowed business object.",
  inputSchema: batchCreateSchema,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
}, (input) => run(() => batchCreateRecords(input.entity, input.data), input.response_format));

server.registerTool("twenty_batch_update_records", {
  title: "Batch-update Twenty CRM records",
  description: "Patch all records matching a required filter in an allowed business object.",
  inputSchema: batchUpdateSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true }
}, (input) => run(() => batchUpdateRecords(input.entity, input.filter, input.data, input.depth), input.response_format));

server.registerTool("twenty_batch_soft_delete_records", {
  title: "Batch soft-delete Twenty CRM records",
  description: "Soft-delete records matching a required filter. Never hard-deletes. Disabled unless TWENTY_ALLOW_DESTRUCTIVE=true.",
  inputSchema: batchSoftDeleteSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true }
}, (input) => run(() => batchSoftDeleteRecords(input.entity, input.filter), input.response_format));

server.registerTool("twenty_find_duplicates", {
  title: "Find duplicate Twenty CRM records",
  description: "Check supplied record IDs or candidate data for duplicates without modifying CRM data.",
  inputSchema: duplicatesSchema,
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
}, (input) => run(() => findDuplicates(input.entity, { ids: input.ids, data: input.data }), input.response_format));

server.registerTool("twenty_group_records", {
  title: "Group Twenty CRM records",
  description: "Group and optionally aggregate records using Twenty group_by syntax. Read-only.",
  inputSchema: groupBySchema,
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
}, (input) => run(() => groupRecords(input.entity, {
  group_by: input.group_by,
  aggregate: input.aggregate,
  filter: input.filter,
  limit: input.limit,
  include_records_sample: input.include_records_sample
}), input.response_format));

server.registerTool("twenty_merge_records", {
  title: "Preview or merge Twenty CRM records",
  description: "Preview a merge by default. An actual merge requires dry_run=false and TWENTY_ALLOW_DESTRUCTIVE=true.",
  inputSchema: mergeSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true }
}, (input) => run(() => mergeRecords(input.entity, input.ids, input.conflict_priority_index, input.dry_run), input.response_format));

server.registerTool("twenty_restore_record", {
  title: "Restore a Twenty CRM record",
  description: "Restore one soft-deleted record by object and UUID.",
  inputSchema: restoreSchema,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
}, (input) => run(() => restoreRecord(input.entity, input.id, input.depth), input.response_format));

server.registerTool("twenty_restore_records", {
  title: "Restore multiple Twenty CRM records",
  description: "Restore soft-deleted records matching a required filter.",
  inputSchema: restoreManySchema,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
}, (input) => run(() => restoreManyRecords(input.entity, input.filter, input.depth), input.response_format));

async function main(): Promise<void> {
  if (!process.env.TWENTY_API_KEY?.trim() || !process.env.TWENTY_API_URL?.trim()) {
    console.error("TWENTY_API_KEY and TWENTY_API_URL are required in the parent MCP client environment.");
    process.exit(1);
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Twenty CRM MCP ready: 14 tools across ${ENTITIES.length} objects`);
}

main().catch((error: unknown) => {
  console.error("Twenty CRM MCP startup failed:", apiErrorMessage(error));
  process.exit(1);
});
