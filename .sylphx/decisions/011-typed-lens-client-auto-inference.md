# 011. Typed Lens Client with Auto-Inference

**Status:** ✅ Accepted
**Date:** 2024-11-22

## Context

Initial Lens design required manual type parameter every time client was accessed, diverging from TypeScript-first DX and adding unnecessary boilerplate:

```typescript
import { getLensClient } from "@sylphx/code-client";
import type { API } from "@sylphx/code-api";

// Every usage requires <API>
const client = getLensClient<API>();
const client2 = useLensClient<API>();
```

This violated TypeScript-first principles - type should be inferred, not manually specified repeatedly.

## Decision

Create typed singleton `lensClient` with pre-configured API type using lazy proxy pattern. Export as primary API.

## Rationale

- **TypeScript-first**: Type baked into client, zero manual annotations (like tRPC)
- **Impossible to misuse**: Can't use wrong API type
- **Clean imports**: No type imports needed
- **Single source of truth**: API type configured once in code-client
- **Developer experience**: Autocomplete works immediately

## Implementation

```typescript
// packages/code-client/src/lens-client.ts
import type { API } from "@sylphx/code-api";
import type { LensClient } from "@sylphx/lens-client";

// Typed singleton with lazy initialization
export const lensClient: LensClient<API> = new Proxy({} as LensClient<API>, {
  get: (_target, prop) => {
    const client = getLensClientGeneric<API>();
    return (client as any)[prop];
  },
});

// Typed React hook
export function useLensClient(): LensClient<API> {
  return useLensClientGeneric<API>();
}
```

**Usage:**
```typescript
// Before - Manual type parameter every time
import { getLensClient } from "@sylphx/code-client";
import type { API } from "@sylphx/code-api";
const client = getLensClient<API>();

// After - Zero type annotations
import { lensClient } from "@sylphx/code-client";
// Direct use, fully typed
lensClient.session.getById.query({ sessionId });
```

## Consequences

**Positive:**
- Zero manual type annotations across entire codebase
- Impossible to use wrong API type
- Clean imports (no API type import needed)
- Fully typed autocomplete
- Matches tRPC's TypeScript-first DX

**Negative:**
- Lazy proxy adds minimal runtime overhead (negligible)
- Type is hardcoded to code-api's API (by design - single app)

## References

- Implementation: `packages/code-client/src/lens-client.ts`
- Exported from: `packages/code-client/src/index.ts`
- Migrated files: 9 hooks using new pattern
- Related: ADR-010 (Optional Input), ADR-012 (Context Auto-Inference)
