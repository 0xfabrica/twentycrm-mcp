# Twenty CRM MCP

[![CI](https://github.com/0xfabrica/twentycrm-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/0xfabrica/twentycrm-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js 20.6+](https://img.shields.io/badge/Node.js-20.6%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

Give Codex, Claude Code, and other MCP clients controlled access to your
[Twenty](https://twenty.com/) CRM.

This is an **unofficial, community-built integration**. It is not affiliated
with, endorsed by, or sponsored by Twenty.com, PBC.

## Why this server

Twenty exposes the same operation families across many object types. This
server uses a validated `entity` parameter, so an agent loads 14 composable
tools instead of hundreds of near-duplicate tool definitions.

- Read, search, create, update, group, deduplicate, merge, restore, and batch
  records.
- Covers 28 standard Twenty objects, including companies, people,
  opportunities, tasks, notes, workflows, calendar objects, and messaging
  objects.
- Runs locally over stdio. Your API key is sent only to the Twenty API.
- Uses conservative defaults: no hard delete, guarded soft delete and merge,
  and a restricted write allowlist.
- Returns structured MCP content for reliable follow-up tool calls.

## Native Twenty MCP or this server?

Twenty 2.0 introduced native MCP capabilities. If your workspace already
provides the access and controls you need, start with the native integration.

This project is useful when you want a small, auditable local stdio process,
API-key authentication, compatibility with a self-hosted or older workspace,
or explicit safety controls in front of record writes. Its differentiator is a
stable 14-tool surface with a write allowlist, dry-run merges, and no hard
delete—not replacing every native Twenty feature.

## Quick start

### 1. Requirements

- Node.js 20.6 or newer
- Codex, Claude Code, or another stdio-compatible MCP client
- A Twenty workspace and API key

### 2. Install

```bash
git clone https://github.com/0xfabrica/twentycrm-mcp.git
cd twentycrm-mcp
npm ci
npm test
```

### 3. Add your Twenty credentials

Create a local environment file:

```bash
cp .env.example .env
```

Edit `.env`:

```dotenv
# Twenty Cloud
TWENTY_API_URL=https://api.twenty.com/rest

# Create this in Settings > API & Webhooks
TWENTY_API_KEY=replace_with_your_api_key

# Keep destructive operations disabled for normal agent sessions
TWENTY_ALLOW_DESTRUCTIVE=false
```

This example omits `TWENTY_WRITABLE_ENTITIES`, so the server uses its default
CRM write allowlist: companies, people, opportunities, tasks, notes, note
targets, and task targets. To start in fully read-only mode, add:

```dotenv
TWENTY_WRITABLE_ENTITIES=
TWENTY_ALLOW_DESTRUCTIVE=false
```

An empty `TWENTY_WRITABLE_ENTITIES` value disables every write tool. By
contrast, `TWENTY_ALLOW_DESTRUCTIVE=false` only blocks soft deletes and real
merges; it does not block ordinary creates, updates, upserts, or restores.

For a self-hosted workspace, use `https://your-domain.example/rest`. The URL
must end in `/rest`, not `/rest/core`.

Create the key in **Settings > API & Webhooks > Create key**. Twenty shows it
once, so store it immediately. Assign the key a least-privilege role whenever
possible. See the [official Twenty API documentation](https://docs.twenty.com/developers/extend/api).

The `.env` file is ignored by Git. On macOS or Linux, you can additionally
restrict it to your user:

```bash
chmod 600 .env
```

### 4. Register the MCP server

Both commands below store absolute paths, so run them from the cloned repo.

#### Codex

```bash
codex mcp add twenty-crm -- node \
  --env-file="$(pwd)/.env" \
  "$(pwd)/dist/index.js"
```

Inspect the registration:

```bash
codex mcp get twenty-crm
```

For manual configuration, add this to `~/.codex/config.toml` and replace both
paths:

```toml
[mcp_servers.twenty-crm]
command = "node"
args = [
  "--env-file=/absolute/path/to/twentycrm-mcp/.env",
  "/absolute/path/to/twentycrm-mcp/dist/index.js"
]
startup_timeout_sec = 20
tool_timeout_sec = 60
default_tools_approval_mode = "prompt"
```

#### Claude Code

```bash
claude mcp add --scope user twenty-crm -- node \
  --env-file="$(pwd)/.env" \
  "$(pwd)/dist/index.js"
```

Inspect the registration:

```bash
claude mcp get twenty-crm
```

Restart the MCP client after registering the server.

#### Windows PowerShell

From the cloned repository:

```powershell
$Repo = (Get-Location).Path
Copy-Item .env.example .env
# Edit .env and replace the example API key before continuing.
codex mcp add twenty-crm -- node "--env-file=$Repo\.env" "$Repo\dist\index.js"
claude mcp add --scope user twenty-crm -- node "--env-file=$Repo\.env" "$Repo\dist\index.js"
```

Then restart Codex or Claude Code and inspect the registration with the same
`mcp get` commands shown above. Codex's manual user configuration is at
`$env:USERPROFILE\.codex\config.toml`.

Do not keep `.env` in a shared or cloud-synced folder. If you prefer persistent
user environment variables on Windows, set them from PowerShell and restart
the client:

```powershell
[Environment]::SetEnvironmentVariable("TWENTY_API_URL", "https://api.twenty.com/rest", "User")
[Environment]::SetEnvironmentVariable("TWENTY_API_KEY", "your-api-key", "User")
```

### Environment-only alternative

If you prefer not to use a local `.env`, export the variables in the parent
environment before launching your MCP client:

```bash
export TWENTY_API_URL="https://api.twenty.com/rest"
export TWENTY_API_KEY="your-api-key"
```

Then register `node /absolute/path/to/twentycrm-mcp/dist/index.js` without the
`--env-file` argument. Do not place a real key directly in MCP JSON or TOML.

## Example prompts

Start with discovery and keep writes explicit:

```text
List the 10 most recently updated companies in Twenty. Do not modify anything.
```

```text
Find people whose email domain is example.com and summarize their companies.
```

```text
Preview possible duplicate companies named Acme. Do not merge records.
```

```text
Create a follow-up task for this opportunity, then show me the created record.
```

## Tools

| Tool | Behavior |
|---|---|
| `twenty_list_records` | List, filter, order, and page through an object |
| `twenty_search_records` | Targeted list with a required filter |
| `twenty_get_record` | Fetch one record by UUID |
| `twenty_create_record` | Create or optionally upsert one record |
| `twenty_update_record` | Patch one record |
| `twenty_soft_delete_record` | Guarded soft delete |
| `twenty_batch_create_records` | Create 1–50 records |
| `twenty_batch_update_records` | Patch records matching a required filter |
| `twenty_batch_soft_delete_records` | Guarded filtered soft delete |
| `twenty_find_duplicates` | Check IDs or candidate data for duplicates |
| `twenty_group_records` | Group and aggregate records |
| `twenty_merge_records` | Preview a merge or perform a guarded merge |
| `twenty_restore_record` | Restore one soft-deleted record |
| `twenty_restore_records` | Restore records matching a filter |

## Safety model

Agents can make mistakes. This server limits the blast radius, but it is not an
authorization boundary.

- There is no hard-delete tool.
- Delete operations always request Twenty's soft-delete behavior.
- Soft delete and real merges are disabled unless
  `TWENTY_ALLOW_DESTRUCTIVE=true`.
- Merge defaults to `dry_run=true`.
- Batch creates are limited to 50 records per call.
- Non-local API URLs must use HTTPS.
- API errors do not echo response bodies or credentials.
- Tool annotations tell clients which operations are read-only or destructive.

Use a least-privilege Twenty role, review tool calls before approval, and keep
backups appropriate for your workspace.

### `TWENTY_WRITABLE_ENTITIES`: choose what agents may modify

This is a server-side write allowlist. It controls which supported Twenty
objects the MCP may create, update, restore, soft-delete, or merge.

If the variable is omitted, writes are allowed by default only for:

```text
companies,people,opportunities,tasks,notes,noteTargets,taskTargets
```

Set a narrower comma-separated list to reduce write access:

```dotenv
TWENTY_WRITABLE_ENTITIES=companies,people,opportunities,tasks,notes
```

Set an explicitly empty value for read-only mode:

```dotenv
TWENTY_WRITABLE_ENTITIES=
```

Objects outside the allowlist remain readable but cannot be modified through
this MCP. The allowlist can only reduce access: the role assigned to the Twenty
API key must also permit the operation. Keep internal and system objects
read-only unless you have reviewed their schema and permissions.

Changes take effect when the MCP process starts. Restart Codex, Claude Code, or
your other MCP client after editing `.env`.

### `TWENTY_ALLOW_DESTRUCTIVE`: guard deletes and merges

Keep this setting false or unset during routine use:

```dotenv
TWENTY_ALLOW_DESTRUCTIVE=false
```

With `false`:

- `twenty_soft_delete_record` and `twenty_batch_soft_delete_records` are
  blocked before an HTTP request is sent.
- `twenty_merge_records` may preview a merge with `dry_run=true`, but cannot
  perform the real merge.
- Ordinary creates, upserts, updates, batch writes, and restores are still
  allowed for objects in `TWENTY_WRITABLE_ENTITIES`.

Set it to `true` only for a deliberate, supervised session. The write allowlist
and Twenty API-key permissions still apply. This server never exposes a hard
delete, even when destructive operations are enabled.

After the supervised operation, set it back to `false` and restart the MCP
client.

### Recommended safety presets

| Preset | Configuration | Result |
|---|---|---|
| Read-only first run | `TWENTY_WRITABLE_ENTITIES=` and `TWENTY_ALLOW_DESTRUCTIVE=false` | All reads work; every write is blocked |
| Standard CRM work | Omit `TWENTY_WRITABLE_ENTITIES`; keep destructive `false` | Common CRM objects can be created or updated; deletes and real merges are blocked |
| Narrow writer | Set only the required entities; keep destructive `false` | Writes are limited to those objects |
| Supervised cleanup | Set only required entities and temporarily set destructive `true` | Soft delete and real merge become available for those objects |

### Operation risk matrix

`TWENTY_ALLOW_DESTRUCTIVE=false` does **not** make the entire server read-only.
It blocks soft deletes and real merges; the configured write allowlist still
permits ordinary record writes.

| Category | Tools | Behavior |
|---|---|---|
| Read-only | list, search, get, find duplicates, group | Never modifies records |
| Writes | create/upsert, update, batch create/update, restore | Modifies allowed objects without the destructive flag |
| Guarded | soft delete, batch soft delete | Requires `TWENTY_ALLOW_DESTRUCTIVE=true` |
| Preview/guarded | merge | Dry-run by default; a real merge requires the destructive flag |

An upsert may update an existing record when Twenty finds a matching unique
value. Review the proposed data and use a least-privilege API-key role even
when destructive operations are disabled.

## Configuration reference

| Variable | Required | Default | Purpose |
|---|---:|---|---|
| `TWENTY_API_URL` | Yes | — | Twenty REST root ending in `/rest` |
| `TWENTY_API_KEY` | Yes | — | Workspace API key |
| `TWENTY_WRITABLE_ENTITIES` | No | Common CRM objects when omitted | Comma-separated write allowlist; an empty value disables all writes |
| `TWENTY_ALLOW_DESTRUCTIVE` | No | `false` | Enables soft delete and non-dry-run merge; does not control ordinary writes |
| `TWENTY_ALLOW_INSECURE_HTTP` | No | `false` | Allows HTTP for non-local testing; not recommended |

## Supported objects

The current allowlist contains 28 standard objects:

<details>
<summary>Show all objects</summary>

```text
companies
people
opportunities
tasks
notes
attachments
timelineActivities
dashboards
workflows
workflowVersions
workflowRuns
workflowAutomatedTriggers
calendarEvents
calendarChannels
calendarEventParticipants
calendarChannelEventAssociations
messages
messageChannels
messageThreads
messageParticipants
messageChannelMessageAssociations
messageFolders
messageChannelMessageAssociationMessageFolders
noteTargets
taskTargets
connectedAccounts
blocklists
workspaceMembers
```

</details>

Twenty generates APIs from each workspace schema. Custom objects are not yet
accepted by this server's validated entity allowlist; contributions that add a
safe discovery mechanism are welcome.

## Development and verification

Build the TypeScript server:

```bash
npm run build
```

Run the offline protocol and API-contract smoke test:

```bash
npm test
```

Run the optional live, read-only smoke test after setting credentials:

```bash
npm run test:live
```

The live test lists at most one company and does not modify CRM data.
Unlike `codex mcp get` and `claude mcp get`, which inspect client registration,
this command verifies authenticated access to the Twenty API.

CI runs the build, offline smoke test, and a production-dependency audit on
every pull request.

## Troubleshooting

### `TWENTY_API_KEY and TWENTY_API_URL are required`

The MCP process cannot see your credentials. Use an absolute `.env` path in the
client configuration or launch the client from a shell that exports both
variables.

### `getaddrinfo ENOTFOUND your-twenty.example.com`

The example URL was not replaced. Twenty Cloud uses
`https://api.twenty.com/rest`; self-hosted installations use their own domain.

### `401` or `403`

Replace or rotate the API key, then check the role assigned to that key in
Twenty. A valid key can still be denied access to specific objects or writes.

### `404`

Check that the base URL ends in `/rest`, the entity exists in your workspace,
and the record UUID is correct.

### The client does not show the tools

Run `npm run build`, confirm the configured `dist/index.js` path is absolute,
and restart the client. Use `codex mcp get twenty-crm` or
`claude mcp get twenty-crm` to inspect the registration.

## Scope and limitations

- This server targets Twenty's core REST record API, not its metadata API.
- It does not send email. Use an approved Twenty workflow, n8n workflow, or mail
  integration for delivery.
- Workspace-specific custom objects are not currently auto-discovered.
- Twenty's native MCP may be a better fit for current cloud workspaces.
- Twenty's API and object schemas may change; deploy a reviewed commit or
  release tag and test it before using sensitive workflows.

## Security

Never commit a Twenty API key. If a key appears in a commit, issue, CI log, or
terminal transcript, rotate it immediately. See [SECURITY.md](SECURITY.md) for
the vulnerability-reporting process.

## Contributing

Issues and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md)
and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before proposing a change.

## License

This project is available under the [MIT License](LICENSE).

Twenty is a product and name of Twenty.com, PBC. This independent project uses
the name only to identify API compatibility. See [NOTICE.md](NOTICE.md).
