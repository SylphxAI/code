# 010. Optional Input Support (Void Input)

**Status:** ✅ Accepted
**Date:** 2024-11-22

## Context

Lens initially required input parameter for all operations, forcing developers to pass empty objects `{}` for parameterless queries/mutations. This was verbose and diverged from clean API patterns like tRPC.

```typescript
// Verbose - requires empty object
const processes = await client.bash.list.query({});
const count = await client.session.getCount.query({});
```

## Decision

Support `void` as input type in Lens core, using TypeScript conditional types to make input parameter optional when input type is void.

## Rationale

- **Clean API**: Parameterless operations match tRPC's ergonomic API
- **Type safety**: TypeScript enforces correct usage - can't pass arguments to void input operations
- **Developer experience**: Reduces boilerplate and cognitive load
- **Consistency**: API matches natural TypeScript patterns

## Implementation

```typescript
// lens-core/src/schema/types.ts
export interface LensQuery<TInput, TOutput, TContext = any> {
  input: TInput extends void ? void : z.ZodType<TInput>;
  resolve: TInput extends void
    ? (ctx: TContext) => Promise<TOutput>
    : (input: TInput, ctx: TContext) => Promise<TOutput>;
}

// lens-client/src/index.ts
export type LensClient<T> = {
  [K in keyof T]: T[K] extends { type: "query" }
    ? InferInput<T[K]> extends void
      ? {
          query(): Promise<InferOutput<T[K]>>;
          // ... other overloads
        }
      : {
          query(input: InferInput<T[K]>): Promise<InferOutput<T[K]>>;
          // ... other overloads
        }
    : // ...
};
```

## Consequences

**Positive:**
- Clean, ergonomic API for parameterless operations
- Type-safe - impossible to pass arguments to void input operations
- Consistent with tRPC and other TypeScript-first frameworks
- Reduced boilerplate (18 instances in code-api alone)

**Negative:**
- Conditional types add complexity to type definitions
- Two signatures to maintain (void vs parameterized)

## References

- Implementation: `packages/lens-core/src/schema/{types,builder}.ts`
- Client types: `packages/lens-client/src/index.ts`
- Migration: ADR-011 (Typed Lens Client)
- API usage: `packages/code-api/src/api.ts` (9 void input operations)
