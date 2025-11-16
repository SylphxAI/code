# Technical Debt Tracking

This document tracks known technical debt, TODOs, and future improvements for the Sylphx Code project.

## Critical Priority

### 1. Credential Encryption (SECURITY)
**File:** `packages/code-core/src/registry/credential-registry.ts`
**Issue:** API keys and credentials stored in plaintext JSON files
**Required:** AES-256-GCM encryption + OS keychain integration
**Tracked:** Security roadmap item
**Risk:** High - Credentials could be stolen from filesystem
**Timeline:** Before production release

## High Priority

### 2. Test Coverage
**Current:** ~7% (23 test files for 323 source files)
**Target:** 70% coverage
**Status:** Ongoing - need unit, integration, and E2E tests
**Focus Areas:**
- Authentication/authorization
- Database operations
- Streaming logic
- Error handling paths
- Edge cases

### 3. Remaining Console.log Migration
**Current:** ~381 console.* statements remaining (Phase 2)
**Status:** Phase 1 complete (critical paths migrated to logger)
**Remaining:**
- code-server streaming services
- code-core services and utilities
- Development/debug console.log statements

## Medium Priority

### 4. Compact Session Progress Streaming
**File:** `packages/code-server/src/trpc/routers/session.router.ts:352`
**TODO:** Stream progress events for real-time updates during session compaction
**Current:** Progress tracked but not emitted to client
**Benefit:** Better UX for long-running compaction operations

### 5. Notification Settings Implementation
**File:** `packages/code/src/commands/definitions/notifications.command.tsx:34`
**Status:** Command exists but not fully implemented
**Required:**
- Add notificationSettings to store
- Add to CommandContext
- Implement enable/disable/configure logic
**Impact:** Feature gap - users can't configure notifications

### 6. Signal Initialization Timing
**File:** `packages/code/src/index.ts:212`
**Issue:** Module resolution issue prevents zen signal initialization before React app
**Workaround:** Currently handled at runtime
**Ideal:** Initialize signals before React render
**Impact:** Low - current approach works but not optimal

## Low Priority

### 7. Keyboard Hook Migration
**File:** `packages/code-client/src/hooks/useKeyboard.ts:4`
**Status:** Disabled temporarily
**TODO:** Migrate to zen signals for consistency
**Current:** Commented out, no functionality loss
**Timeline:** When refactoring keyboard handling

### 8. API Inventory Auto-Generation
**File:** `packages/code-server/src/utils/api-inventory.ts:27`
**TODO:** Auto-generate from tRPC router introspection
**Current:** Manual maintenance
**Benefit:** Reduces maintenance burden
**Risk:** Low - manual works fine for now

## Deprecated TODOs (Cleaned Up)

Items that were TODOs but have been resolved or are no longer relevant:
- ✅ Circular dependency (code-core → code-client) - **FIXED**
- ✅ Large god files (streaming.service.ts, session-repository.ts, Chat.tsx) - **REFACTORED**
- ✅ Type safety violations (`any` types, `z.any()` schemas) - **FIXED**
- ✅ Missing React.memo/useMemo - **ADDED**
- ✅ Barrel exports preventing tree-shaking - **FIXED**

## Architectural Debt

### Bundle Size Optimization Opportunities
- Tool configs could be lazy loaded (currently loaded upfront)
- React screens could use code splitting
- Additional provider SDKs could be lazy loaded

### Performance Optimizations
- DataLoader pattern for N+1 query prevention
- Query caching layer
- Bundle analysis and optimization

## Maintenance Reminders

- **Feature Flags:** Review and remove completed feature flags periodically
- **Dependencies:** Update outdated packages quarterly
- **Documentation:** Keep `.sylphx/` docs in sync with code changes
- **ADRs:** Document significant architectural decisions

---

**Last Updated:** 2024-11-15
**Next Review:** Before v1.0 release
