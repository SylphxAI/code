# Sylphx Code

`SylphxAI/code` is a Bun/TypeScript monorepo for an AI code assistant with a
headless SDK, server/daemon API, shared client package, terminal UI, and web UI.

## Lifecycle

- State: `active`
- Layer: `tooling`
- Machine manifest: [`.doctrine/project.json`](./.doctrine/project.json)

## Goals

- Provide the `@sylphx/code-core`, `@sylphx/code-api`,
  `@sylphx/code-server`, `@sylphx/code-client`, `@sylphx/code`, and
  `@sylphx/code-web` workspace packages.
- Own the AI provider adapters, tool execution, session persistence, server
  streaming API, multi-client state sync, terminal UI, and web UI in this
  monorepo.
- Keep package boundaries layered so UI clients consume the shared client/server
  surfaces instead of duplicating core business logic.

## Non-Goals

- This repo does not own enterprise doctrine, model vendor account operations,
  customer-specific prompting policy, hosted platform deployment, or unrelated
  downstream agent behavior.
- This repo does not own the `@sylphx/lens` packages it consumes.

## Boundary

Sylphx Code owns the code-assistant product and its package surfaces. Core
business logic belongs in `packages/code-core`, API/server behavior belongs in
`packages/code-api` and `packages/code-server`, shared UI/client state belongs
in `packages/code-client`, and interfaces live in `packages/code` and
`packages/code-web`.

## Public Surfaces

- Package exports: root `package.json` and `packages/*/package.json`
- CLI binary: `packages/code/package.json`
- Server binary/API: `packages/code-server/package.json`
- Documentation: `README.md`, package READMEs, `docs/`
- Release workflow: `.github/workflows/release.yml`

## Delivery

This repo delegates main-branch release to the reusable SylphxAI `.github`
workflow. Production proof for package or UI behavior is relevant package
typecheck, tests, builds, release workflow success, and package or deployment
readback when published.
