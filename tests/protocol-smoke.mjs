import assert from "node:assert/strict";
import http from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { DEFAULT_WRITABLE_ENTITIES, writableEntities } from "../dist/constants.js";

const previousWritableEntities = process.env.TWENTY_WRITABLE_ENTITIES;
try {
  delete process.env.TWENTY_WRITABLE_ENTITIES;
  assert.deepEqual([...writableEntities()], [...DEFAULT_WRITABLE_ENTITIES]);

  process.env.TWENTY_WRITABLE_ENTITIES = "";
  assert.equal(writableEntities().size, 0, "an explicitly empty allowlist must disable all writes");

  process.env.TWENTY_WRITABLE_ENTITIES = "companies, people";
  assert.deepEqual([...writableEntities()], ["companies", "people"]);
} finally {
  if (previousWritableEntities === undefined) delete process.env.TWENTY_WRITABLE_ENTITIES;
  else process.env.TWENTY_WRITABLE_ENTITIES = previousWritableEntities;
}

const requests = [];
const api = http.createServer((request, response) => {
  requests.push({ url: request.url, method: request.method, authorization: request.headers.authorization });
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify({
    data: { companies: [{ id: "11111111-1111-4111-8111-111111111111", name: "Example Co" }] },
    totalCount: 1,
    pageInfo: { startCursor: "start", endCursor: "end", hasNextPage: false, hasPreviousPage: false }
  }));
});

await new Promise((resolve, reject) => {
  api.once("error", reject);
  api.listen(0, "127.0.0.1", resolve);
});

const address = api.address();
assert.ok(address && typeof address === "object");
const inheritedEnv = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== undefined));
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [new URL("../dist/index.js", import.meta.url).pathname.replace(/^\/(.:\/)/, "$1")],
  env: {
    ...inheritedEnv,
    TWENTY_API_KEY: "test-token",
    TWENTY_API_URL: `http://127.0.0.1:${address.port}/rest`,
    TWENTY_ALLOW_DESTRUCTIVE: "false"
  },
  stderr: "pipe"
});

const client = new Client({ name: "twentycrm-mcp-test", version: "0.1.0" });

try {
  await client.connect(transport);
  const tools = await client.listTools();
  assert.equal(tools.tools.length, 14);
  assert.ok(tools.tools.every((tool) => tool.annotations));

  const result = await client.callTool({
    name: "twenty_list_records",
    arguments: { entity: "companies", limit: 1, depth: 0, response_format: "json" }
  });
  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent.totalCount, 1);
  assert.equal(result.structuredContent.data.companies.length, 1);

  const destructive = await client.callTool({
    name: "twenty_soft_delete_record",
    arguments: {
      entity: "companies",
      id: "00000000-0000-4000-8000-000000000000",
      response_format: "json"
    }
  });
  assert.equal(destructive.isError, true);
  assert.match(destructive.content[0].text, /disabled/i);

  assert.equal(requests.length, 1, "destructive request must be blocked before HTTP");
  assert.equal(requests[0].method, "GET");
  assert.match(requests[0].url, /^\/rest\/companies\?/);
  assert.equal(requests[0].authorization, "Bearer test-token");

  console.log(JSON.stringify({ protocol: "ok", toolCount: 14, apiContract: "ok", destructiveGuard: "ok" }, null, 2));
} finally {
  await client.close();
  await new Promise((resolve) => api.close(resolve));
}
