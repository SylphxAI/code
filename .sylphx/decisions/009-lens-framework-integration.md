# 009. Migrate to Lens Framework with Type-Safe Field Selection

**Status:** ✅ Accepted
**Date:** 2024-11-22

## Context

Current tRPC implementation has inconsistent event granularity mixing field-level events (`session-status-updated`, `session-tokens-updated`, `session-title-updated-start/delta/end`) with model-level events, creating complexity in client state management and preventing frontend-driven data fetching optimization.

## Decision

Replace tRPC with Lens framework, implementing model-level event granularity and type-safe field selection using object syntax.

## Rationale

- **Frontend-driven architecture**: Client controls field selection and update strategies
- **Unified granularity**: All events at model-level (session-updated, message-updated) instead of mixed field-level
- **Type safety**: Object syntax `{ id: true, title: true }` provides autocomplete and compile-time validation vs unsafe string arrays
- **Optimistic updates**: Consistent model-level pattern unifies all optimistic update logic
- **Performance**: Update strategies (delta/patch/value/auto) reduce transmission by 100x
- **TypeScript-first**: Full type inference without code generation, preserving tRPC's developer experience

## Consequences

**Positive:**
- Type-safe field selection with autocomplete
- Return type inference based on selected fields
- Consistent model-level event handling (6 handlers → 2)
- Frontend controls transmission granularity
- 100x reduction in transmission size potential

**Negative:**
- Migration effort from tRPC to Lens
- New patterns for team to learn
- Breaking changes require coordinated client/server updates

## References

- Implementation: `TYPE_SAFE_LENS_INTEGRATION.md`, `MODEL_LEVEL_EVENTS_MIGRATION_COMPLETE.md`
- Lens framework: `~/lens/packages/lens-{core,client,server}`
- Migration docs: `FIELD_LEVEL_EVENTS_INVENTORY.md`
