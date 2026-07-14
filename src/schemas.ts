import { z } from "zod";
import { DEFAULT_LIMIT, ENTITIES, MAX_LIMIT } from "./constants.js";

export const entitySchema = z.enum(ENTITIES).describe(
  "Twenty object name. Prefer companies, people, opportunities, tasks, and notes for normal CRM work."
);

export const responseFormatSchema = z
  .enum(["json", "markdown"])
  .default("json")
  .describe("Output format. JSON is best for follow-up tool calls; markdown is easier to read.");

const idSchema = z.string().uuid("Record ID must be a UUID");
const dataSchema = z.record(z.string(), z.unknown()).describe(
  "Record fields. Use field names from your Twenty workspace schema."
);
const filterSchema = z.string().min(1).describe(
  "Twenty filter, for example name[ilike]:\"%acme%\" or createdAt[gte]:\"2026-01-01\"."
);
const depthSchema = z.union([z.literal(0), z.literal(1)]).default(0).describe(
  "Relation depth: 0 for the record only, 1 for direct relations."
);
const limitSchema = z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT);

export const listSchema = z.object({
  entity: entitySchema,
  filter: filterSchema.optional(),
  order_by: z.string().min(1).optional(),
  limit: limitSchema,
  depth: depthSchema,
  starting_after: z.string().min(1).optional(),
  ending_before: z.string().min(1).optional(),
  response_format: responseFormatSchema
}).strict();

export const searchSchema = listSchema.extend({ filter: filterSchema }).strict();

export const getSchema = z.object({
  entity: entitySchema,
  id: idSchema,
  depth: depthSchema,
  response_format: responseFormatSchema
}).strict();

export const createSchema = z.object({
  entity: entitySchema,
  data: dataSchema,
  upsert: z.boolean().default(false),
  depth: depthSchema,
  response_format: responseFormatSchema
}).strict();

export const updateSchema = z.object({
  entity: entitySchema,
  id: idSchema,
  data: dataSchema,
  depth: depthSchema,
  response_format: responseFormatSchema
}).strict();

export const softDeleteSchema = z.object({
  entity: entitySchema,
  id: idSchema,
  response_format: responseFormatSchema
}).strict();

export const batchCreateSchema = z.object({
  entity: entitySchema,
  data: z.array(dataSchema).min(1).max(50),
  response_format: responseFormatSchema
}).strict();

export const batchUpdateSchema = z.object({
  entity: entitySchema,
  filter: filterSchema,
  data: dataSchema,
  depth: depthSchema,
  response_format: responseFormatSchema
}).strict();

export const batchSoftDeleteSchema = z.object({
  entity: entitySchema,
  filter: filterSchema,
  response_format: responseFormatSchema
}).strict();

export const duplicatesSchema = z.object({
  entity: entitySchema,
  ids: z.array(idSchema).min(1).optional(),
  data: z.array(dataSchema).min(1).optional(),
  response_format: responseFormatSchema
}).strict().refine((value) => value.ids || value.data, {
  message: "Provide ids or data to check for duplicates"
});

export const groupBySchema = z.object({
  entity: entitySchema,
  group_by: z.string().min(1).describe(
    "Twenty group_by expression, such as [\"stage\"] or [\"createdAt(DAY)\"]."
  ),
  aggregate: z.string().min(1).optional().describe(
    "Optional aggregate expression supported by Twenty, such as [\"id(COUNT)\"]."
  ),
  filter: filterSchema.optional(),
  limit: limitSchema,
  include_records_sample: z.boolean().default(false),
  response_format: responseFormatSchema
}).strict();

export const mergeSchema = z.object({
  entity: entitySchema,
  ids: z.array(idSchema).min(2),
  conflict_priority_index: z.number().int().min(0),
  dry_run: z.boolean().default(true),
  response_format: responseFormatSchema
}).strict().refine(
  (value) => value.conflict_priority_index < value.ids.length,
  { message: "conflict_priority_index must point to an item in ids" }
);

export const restoreSchema = z.object({
  entity: entitySchema,
  id: idSchema,
  depth: depthSchema,
  response_format: responseFormatSchema
}).strict();

export const restoreManySchema = z.object({
  entity: entitySchema,
  filter: filterSchema,
  depth: depthSchema,
  response_format: responseFormatSchema
}).strict();
