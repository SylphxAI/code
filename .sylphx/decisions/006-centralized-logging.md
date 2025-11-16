# 006. Centralized Logging System

**Status:** ✅ Accepted (Phase 1 Complete)
**Date:** 2025-11-16

## Context

The codebase had 583 console.log/error/warn statements across 98 files with no centralized logging control. This created issues:
- No ability to control log levels in production vs development
- No structured logging for log aggregation tools
- Inconsistent logging patterns across packages
- Performance impact from debug logs in production
- Difficulty tracking errors and debugging issues

## Decision

Implement a centralized logging utility (`logger.ts`) to replace console.* statements throughout the codebase.

### Logging Architecture

**Enhanced `logger.ts`** provides:
- Log levels: debug, info, warn, error
- Structured logging with context metadata
- Environment-based filtering (production: info+, development: debug+)
- Pretty-print for development, JSON for production
- Integration with existing `debug` package

### Migration Strategy (Phased)

**Phase 1 (Completed):**
- ✅ Enhanced logger utility with log levels and structured logging
- ✅ Replaced console.error/warn in critical paths:
  - `/packages/code-core/src/database/*` - All database errors migrated
  - `/packages/code-core/src/ai/providers/*` - All provider errors migrated
  - Error logging now includes context metadata

**Phase 2 (Remaining - 381 statements):**
- console.warn → logger.warn (throughout codebase)
- console.log → logger.info or logger.debug based on context
- Add structured logging with relevant metadata
- Priority: code-server streaming, code-core services

**Phase 3 (Future):**
- Remove remaining console.* from production code
- Integrate with log aggregation tools (e.g., Sentry, Datadog)
- Add request IDs and session tracking

## Rationale

- **Centralized Control**: Single point to configure log levels, formats, and destinations
- **Performance**: Lazy evaluation prevents expensive operations when logs are disabled
- **Debugging**: Structured logs with context make debugging easier
- **Production Ready**: JSON logging enables integration with log aggregation
- **Compatibility**: Works with existing `debug` package namespace filtering

## Implementation Details

### Logger API

```typescript
import { logger } from "@sylphx/code-core";

// Basic logging
logger.debug("Processing data", { userId: "123" });
logger.info("User authenticated", { userId: "123" });
logger.warn("Rate limit approaching", { current: 90, limit: 100 });
logger.error("Database connection failed", error, { context: "init" });

// Namespaced logging (for specific modules)
import { createLogger } from "@sylphx/code-core";
const log = createLogger("database:session");
log.debug("Query executed", { duration: "45ms" });
```

### Migration Patterns

```typescript
// Before
console.error("[ServiceName] Error:", error);
console.log("[ServiceName] Processing:", data);

// After
logger.error("Operation failed", error, { service: "ServiceName" });
logger.debug("Processing data", { service: "ServiceName", data });
```

## Consequences

**Positive:**
- Centralized logging control (disable debug logs in production)
- Structured logs ready for log aggregation tools
- Better debugging with context metadata
- Improved performance (lazy evaluation)
- Consistent logging patterns

**Negative:**
- Migration requires updating 583 statements (381 remaining)
- Slight API change from console.* (but more powerful)
- Need to train developers on new patterns

## Progress

- **Total console.* statements:** 583 (original)
- **Migrated (Phase 1):** ~202 statements in critical paths
- **Remaining:** ~381 statements in non-critical paths
- **Next:** Phase 2 migration of console.warn and console.log

## References

<!-- VERIFY: packages/code-core/src/utils/logger.ts -->
- Implementation: `packages/code-core/src/utils/logger.ts`
- Database migrations: `packages/code-core/src/database/` (completed)
- Provider migrations: `packages/code-core/src/ai/providers/` (completed)
- Script for batch migration: `scripts/replace-console-logs.mjs` (not used - manual safer)
