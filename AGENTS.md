# Repository Agent Instructions

This repository follows the central doctrine in
[SylphxAI/doctrine](https://github.com/SylphxAI/doctrine).

Before changing behavior, read [PROJECT.md](./PROJECT.md) and
[.doctrine/project.json](./.doctrine/project.json). Keep enterprise policy in
doctrine; keep only repo-local package and product facts here.

Useful validation for package changes:

- `bun run type-check`
- `bun run test`
- `bun run lint`
- `bun run build`

Keep the monorepo layers clean: core business logic in `packages/code-core`,
API/server contracts in `packages/code-api` and `packages/code-server`, shared
client state in `packages/code-client`, and UI behavior in `packages/code` or
`packages/code-web`. Do not put UI-specific state or customer-specific workflow
policy into the headless core.
