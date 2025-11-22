# Lens Migration Status

## ✅ Completed

### Phase 1: Lens Core Architecture (DONE)
- **Context Injection** - InProcessTransport supports context parameter
- **lens-core** - Modified to pass `context` as second parameter to resolvers
- **lens-server** - Added `context` field to LensServerConfig
- **lens-server handlers** - All handlers (HTTP, WebSocket, SSE) pass context to resolvers

### Phase 2: API Migration (PARTIAL - Core Complete)
- **sessionAPI** ✅ - All queries and mutations migrated to Lens
  - Queries: `getRecent`, `getById`, `getCount`, `getLast`, `search`
  - Mutations: `create`, `updateTitle`, `updateModel`, `updateProvider`, `updateRules`, `updateAgent`, `delete`, `compact`
- **messageAPI** ✅ - Streaming subscription migrated
  - Subscription: `streamResponse` with Observable<StreamEvent>
- **todoAPI** ✅ - Todo management migrated
  - Mutation: `update` with atomic todo replacement

### Phase 3: Server Integration (DONE)
- **LensServer class** - Integrates InProcessTransport and HTTP/SSE handlers
- **code-server integration** - Uses `createLensServer` with AppContext
- **All builds passing** ✅

## 🔄 In Progress

### Remaining Router Migrations
These routers still use tRPC and need Lens migration:

1. **configRouter** (753 lines) - Complex, many endpoints
   - Queries: `load`, `getPaths`, `getProviders`, `getProviderSchema`, `getTokenizerInfo`, `countTokens`, `countFileTokens`, `scanProjectFiles`, `getModelDetails`, `fetchModels`
   - Mutations: `updateDefaultProvider`, `updateDefaultModel`, `updateProviderConfig`, `setProviderSecret`, `removeProvider`, `save`, `updateRules`

3. **fileRouter** (138 lines)
   - Queries: `download`, `getMetadata`
   - Mutations: `upload`

4. **bashRouter**
   - Shell command execution endpoints

5. **adminRouter**
   - Administrative endpoints

6. **eventsRouter**
   - Event stream subscriptions

## 📋 TODO

### Next Steps (Priority Order)

1. **Migrate remaining routers** to Lens API
   - ✅ Simple: todoRouter (DONE)
   - Next: fileRouter (138 lines)
   - Save complex for last: configRouter (753 lines)

2. **Update TUI client** to use Lens client with InProcessTransport
   - Replace tRPC client calls with Lens client
   - Test in-process communication

3. **End-to-end testing**
   - Test all migrated endpoints
   - Verify context injection works
   - Test streaming subscriptions

4. **Remove tRPC dependencies** (after all migrations complete)
   - Remove @trpc/server
   - Remove @trpc/client
   - Remove tRPC router definitions

## Architecture Summary

### Current State (Hybrid)
```
TUI → Lens InProcessTransport → Lens API (session, message) → AppContext
TUI → tRPC client → tRPC routers (todo, config, file, bash, admin, events) → AppContext
Web → Lens HTTP/SSE → Lens API (session, message) → AppContext
Web → tRPC HTTP → tRPC routers (todo, config, file, bash, admin, events) → AppContext
```

### Target State (After Migration)
```
TUI → Lens InProcessTransport → Lens API (all endpoints) → AppContext
Web → Lens HTTP/SSE → Lens API (all endpoints) → AppContext
```

## Technical Decisions Made

### ✅ Option A: Modify Lens Core for Context Injection
User explicitly requested architectural completeness over workarounds:
> "我要架構完整性，唔要workaround。邊個最完美最完整就用邊個方法。A？"

**Implementation:**
- Added `context?: any` to `InProcessTransportConfig`
- Modified `executeRequest()` to pass `this.config.context` to resolvers
- Modified `subscribe()` to pass context to subscription functions
- Added `context?: any` to `LensServerConfig`
- All resolvers now have signature: `resolve(input, ctx)`

**Result:** Clean, consistent architecture across all transports.

## Files Modified

### Lens Core
- `packages/lens-core/src/transport/in-process.ts` - Context injection
- `packages/lens-core/tsconfig.json` - Build config

### Lens Server
- `packages/lens-server/src/server.ts` - Added context to config
- `packages/lens-server/src/handlers/execute.ts` - Pass context to resolvers
- `packages/lens-server/src/handlers/websocket.ts` - Pass context to subscriptions

### Code API
- `packages/code-api/package.json` - New package (runtime-only)
- `packages/code-api/tsconfig.json` - TypeScript config
- `packages/code-api/src/api.ts` - Lens API definitions
- `packages/code-api/src/schemas/` - Zod schemas for session, message, todo

### Code Server
- `packages/code-server/src/lens-server.ts` - LensServer integration

## Package Structure

```
@sylphx/lens-core       - Core Lens framework with context injection
@sylphx/lens-server     - HTTP/WebSocket/SSE handlers with context support
@sylphx/lens-client     - Type-safe client (tRPC-like DX)
@sylphx/lens-react      - React hooks
@sylphx/lens-transport-* - Various transports (HTTP, SSE, WS)
@sylphx/code-api        - Lens API definitions (runtime-only)
@sylphx/code-server     - Server with LensServer integration
```

## Migration Pattern

### Example: Session Query Migration

**Before (tRPC):**
```typescript
getRecent: publicProcedure
  .input(z.object({ limit: z.number(), cursor: z.number().optional() }))
  .query(async ({ ctx, input }) => {
    return await ctx.sessionRepository.getRecentSessionsMetadata(
      input.limit,
      input.cursor
    );
  })
```

**After (Lens):**
```typescript
getRecent: lens.query({
  input: z.object({
    limit: z.number().min(1).max(100).default(20),
    cursor: z.number().optional()
  }),
  output: PaginatedSessionsSchema,
  resolve: async (
    { limit, cursor }: { limit: number; cursor?: number },
    ctx?: any
  ) => {
    return await ctx.sessionRepository.getRecentSessionsMetadata(limit, cursor);
  },
})
```

**Key Differences:**
- Explicit output schema (type-safe)
- Context passed as second parameter
- Input destructuring with type annotations
- No tRPC procedures, just lens.query/mutation/subscription

## Commits

1. `c3661a7` - feat(lens): Add context injection to InProcessTransport and complete sessionAPI migration
2. `a821fae` - feat(lens): Add context injection to lens-server HTTP/SSE handlers
3. `94ee4a6` - feat(lens): Migrate todoAPI to Lens framework
