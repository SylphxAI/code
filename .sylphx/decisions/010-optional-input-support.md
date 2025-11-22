# 010. Optional Input Support (Method Overloads)

**Status:** ✅ Accepted
**Date:** 2024-11-22

## Context

Lens initially required input parameter for all operations, forcing developers to pass empty objects `{}` for parameterless queries/mutations. This was verbose and diverged from clean API patterns like tRPC.

```typescript
// Verbose - requires empty object
const processes = await client.bash.list.query({});
const count = await client.session.getCount.query({});
```

Initial attempt used `input: void,` but TypeScript rejects this - `void` is a type, not a value.

## Decision

Use **method overloads** with separate config interfaces for parameterless vs parameterized operations. Parameterless operations simply omit the `input` field.

## Rationale

- **TypeScript-first**: `void` cannot be used as property value - method overloads are the correct pattern
- **Clean API**: Natural omission of unused fields (like Pothos, GraphQL)
- **Type safety**: Impossible to provide wrong signature
- **Ergonomic**: Matches how developers naturally write TypeScript
- **No runtime overhead**: Overloads are compile-time only

## Implementation

**Separate interfaces:**
```typescript
// lens-core/src/schema/builder.ts

// Parameterless
export interface QueryConfigNoInput<TOutput, TContext> {
  output: z.ZodType<TOutput>;
  resolve: (ctx: TContext) => Promise<TOutput>;
}

// With params
export interface QueryConfigWithInput<TInput, TOutput, TContext> {
  input: z.ZodType<TInput>;
  output: z.ZodType<TOutput>;
  resolve: (input: TInput, ctx: TContext) => Promise<TOutput>;
}
```

**Method overloads:**
```typescript
class LensBuilder<TContext = any> {
  // Parameterless overload
  query<TOutput>(
    config: QueryConfigNoInput<TOutput, TContext>
  ): LensQuery<void, TOutput, TContext>;

  // With params overload
  query<TInput, TOutput>(
    config: QueryConfigWithInput<TInput, TOutput, TContext>
  ): LensQuery<TInput, TOutput, TContext>;

  // Implementation
  query<TInput, TOutput>(config: any): any { ... }
}
```

**Usage:**
```typescript
// Parameterless - omit input field
const getCount = lens.query({
  output: z.number(),
  resolve: async (ctx) => ctx.sessionRepository.count()
});

// With params - provide input field
const getById = lens.query({
  input: z.object({ id: z.string() }),
  output: SessionSchema,
  resolve: async ({ id }, ctx) => ctx.sessionRepository.findById(id)
});
```

## Consequences

**Positive:**
- ✅ TypeScript-compliant (no invalid syntax)
- ✅ Type-safe - correct signature enforced at compile time
- ✅ Ergonomic - natural field omission
- ✅ Matches Pothos/GraphQL builder patterns
- ✅ Zero runtime overhead (overloads are compile-time)

**Negative:**
- Two interfaces to maintain (NoInput vs WithInput)
- Implementation signature uses `any` (hidden from public API)

## References

- Implementation: `packages/lens-core/src/schema/builder.ts`
- Client types: `packages/lens-client/src/index.ts`
- API usage: `packages/code-api/src/api.ts` (9 parameterless operations)
- Related: ADR-011 (Typed Lens Client), ADR-012 (Context Auto-Inference)
