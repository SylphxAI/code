# 012. Context Type Auto-Inference

**Status:** ✅ Accepted
**Date:** 2024-11-22

## Context

Initial Lens design had untyped context (`ctx?: any`) in all handlers, violating TypeScript-first principles and losing type safety:

```typescript
// Before - No type safety
const api = lens.object({
  getUser: lens.query({
    input: z.object({ id: z.string() }),
    output: UserSchema,
    resolve: async ({ id }, ctx?: any) => {
      ctx.db.users.findOne({ id })  // ❌ No autocomplete, no type checking
    }
  })
});
```

## Decision

Add `TContext` generic to Lens core types and create `createLensBuilder<TContext>()` factory for one-time context type setup with auto-inference in all handlers.

## Rationale

- **TypeScript-first**: Context type inferred automatically (like tRPC, Pothos)
- **One-time setup**: Define context type once, flows through all handlers
- **Type safety**: All context access is type-checked and autocompleted
- **Zero annotations**: No manual `ctx: MyContext` needed in handlers
- **Developer experience**: Like tRPC's `t.procedure.use()` or Pothos builder pattern

## Implementation

**Lens Core:**
```typescript
// lens-core/src/schema/types.ts
export interface LensQuery<TInput, TOutput, TContext = any> {
  resolve: TInput extends void
    ? (ctx: TContext) => Promise<TOutput>
    : (input: TInput, ctx: TContext) => Promise<TOutput>;
}

// lens-core/src/schema/builder.ts
class LensBuilder<TContext = any> {
  query<TInput, TOutput>(
    config: QueryConfig<TInput, TOutput, TContext>
  ): LensQuery<TInput, TOutput, TContext> { ... }
}

export function createLensBuilder<TContext = any>(): LensBuilder<TContext> {
  return new LensBuilder<TContext>();
}
```

**Usage:**
```typescript
// packages/code-api/src/api.ts

// 1. Define context type once
export interface CodeContext {
  sessionRepository: SessionRepository;
  messageRepository: MessageRepository;
  todoRepository: TodoRepository;
  aiConfig: AIConfig;
  appContext: {
    eventStream: AppEventStream;
    bashManagerV2: BashManagerV2;
  };
}

// 2. Create typed builder (one-time setup)
const lens = createLensBuilder<CodeContext>();

// 3. All handlers auto-infer context type
export const api = lens.object({
  session: lens.object({
    getById: lens.query({
      input: z.object({ sessionId: z.string() }),
      output: SessionSchema,
      resolve: async ({ sessionId }, ctx) => {
        // ✅ ctx is CodeContext - fully typed!
        return await ctx.sessionRepository.findById(sessionId);
      }
    })
  })
});
```

## Consequences

**Positive:**
- Full type safety for all context access (59 handlers in code-api)
- Zero manual type annotations in handlers
- One-time setup, lifetime inference
- Impossible to use wrong context type
- Matches tRPC/Pothos TypeScript-first DX

**Negative:**
- Context type must be defined upfront
- All context fields initially typed as `any` (TODO: Import proper types)

**Technical Debt:**
```typescript
// Current - using any for imported types
export interface CodeContext {
  sessionRepository: any;  // TODO: Import SessionRepository
  messageRepository: any;  // TODO: Import MessageRepository
  // ...
}
```

**Resolution:** Import proper types from code-server once available.

## References

- Implementation: `packages/lens-core/src/schema/{types,builder}.ts`
- API definition: `packages/code-api/src/api.ts` (CodeContext + typed builder)
- Related: ADR-010 (Optional Input), ADR-011 (Typed Client)
- Pattern inspiration: tRPC context, Pothos builder
