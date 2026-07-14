# Contributing

Thanks for helping improve Twenty CRM MCP.

## Before opening an issue

- Search existing issues and discussions.
- Do not include API keys, CRM records, customer data, or private workspace
  URLs.
- Use a minimal, synthetic example whenever possible.
- Report security vulnerabilities privately as described in `SECURITY.md`.

## Development setup

```bash
git clone https://github.com/0xfabrica/twentycrm-mcp.git
cd twentycrm-mcp
npm ci
npm test
```

The default test suite is offline and uses a local mock API. A real Twenty
workspace is not required.

## Pull requests

Keep changes focused and explain the user-facing behavior they add or fix.
Before opening a pull request:

```bash
npm test
npm audit --omit=dev --audit-level=high
```

When adding or changing a tool:

- Keep the tool schema narrow and fully described.
- Add or update an offline protocol test.
- Mark read-only and destructive behavior accurately in MCP annotations.
- Preserve the write allowlist and destructive-operation guards.
- Never log response bodies, authorization headers, or credentials.
- Update the README tool table and configuration reference.

Live tests must be read-only unless a maintainer explicitly approves a
different test plan. Never use real customer data in fixtures or screenshots.

## Commit and review expectations

- Use clear, imperative commit messages.
- Avoid unrelated refactors in the same pull request.
- Expect maintainers to request changes that reduce tool scope or risk.
- By contributing, you agree that your contribution is licensed under the MIT
  License.
