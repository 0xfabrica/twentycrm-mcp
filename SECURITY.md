# Security policy

## Supported versions

| Version | Supported |
|---|---|
| `0.1.x` | Yes |
| Older versions | No |

Security fixes are developed on `main` and released in the latest patch
version.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability or exposed credential.
Use GitHub's private vulnerability reporting:

https://github.com/0xfabrica/twentycrm-mcp/security/advisories/new

Include the affected version, impact, reproduction steps, and any suggested
mitigation. The maintainer aims to acknowledge reports within seven days and
coordinate disclosure within 90 days. Complex fixes may require a mutually
agreed extension.

If the private reporting form is not yet available, contact the maintainer
through the [0xfabrica GitHub profile](https://github.com/0xfabrica) to request
a private channel. Do not include vulnerability details in a public issue.

## Secrets

Never commit a Twenty API key. Tokens may appear unexpectedly in generated
OpenAPI descriptions, example URLs, screenshots, or terminal output, so inspect
artifacts before sharing them.

If a token is exposed, rotate it in Twenty immediately. Removing it from the
latest commit is not sufficient because it may remain in Git history.

Use a workspace-scoped, least-privilege role and keep destructive operations
disabled for routine agent sessions.

## Security boundaries

The server's write allowlist and destructive-operation guard reduce accidental
damage; they are not an authorization boundary. Twenty remains responsible for
authenticating the API key and enforcing its workspace role. MCP clients and
operators remain responsible for approving tool calls and protecting local
credentials.
