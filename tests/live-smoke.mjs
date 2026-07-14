import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

assert.ok(process.env.TWENTY_API_KEY, "TWENTY_API_KEY is required");
assert.ok(process.env.TWENTY_API_URL, "TWENTY_API_URL is required");
const inheritedEnv = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== undefined));
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [new URL("../dist/index.js", import.meta.url).pathname.replace(/^\/(.:\/)/, "$1")],
  env: inheritedEnv,
  stderr: "pipe"
});
const client = new Client({ name: "twentycrm-live-smoke", version: "0.1.0" });

try {
  await client.connect(transport);
  const tools = await client.listTools();
  assert.equal(tools.tools.length, 14);
  const result = await client.callTool({
    name: "twenty_list_records",
    arguments: { entity: "companies", limit: 1, depth: 0, response_format: "json" }
  });
  assert.equal(result.isError, undefined);
  assert.equal(typeof result.structuredContent.totalCount, "number");
  console.log(JSON.stringify({ protocol: "ok", liveRead: "ok", toolCount: tools.tools.length }, null, 2));
} finally {
  await client.close();
}
