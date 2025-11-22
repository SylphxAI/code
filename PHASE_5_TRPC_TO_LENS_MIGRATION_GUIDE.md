# Phase 5: tRPC to Lens Migration Guide

## Progress

**Completed:** 4 files ✅
**Remaining:** 28 files 🔄

### ✅ Migrated Files
1. `hooks/client/useSessionListSync.ts` - Lens events (Phase 4)
2. `hooks/client/useBackgroundBashCount.ts` - Lens events (Phase 4)
3. `hooks/client/useCurrentSession.ts` - session.getById.query
4. `hooks/client/useChat.ts` - message.streamResponse.subscribe

---

## Migration Pattern

### Pattern 1: Import Changes

**Before:**
```typescript
import { getTRPCClient } from "@sylphx/code-client";
// or
import { useTRPCClient } from "@sylphx/code-client";
```

**After:**
```typescript
import { getLensClient } from "@sylphx/code-client";
import type { API } from "@sylphx/code-api";
// or
import { useLensClient } from "@sylphx/code-client";
import type { API } from "@sylphx/code-api";
```

---

### Pattern 2: Client Initialization

**Before (Non-React):**
```typescript
const client = getTRPCClient();
```

**After (Non-React):**
```typescript
const client = getLensClient<API>();
```

**Before (React Hook):**
```typescript
const trpc = useTRPCClient();
```

**After (React Hook):**
```typescript
const client = useLensClient<API>();
```

---

### Pattern 3: Query Calls

**Before:**
```typescript
const session = await client.session.getById.query({ sessionId });
const processes = await client.bash.list.query();
const config = await client.config.load.query({ cwd: process.cwd() });
```

**After:**
```typescript
const session = await client.session.getById.query({ sessionId });
const processes = await client.bash.list.query({});  // Empty object required
const config = await client.config.load.query({ cwd: process.cwd() });
```

**Note:** Lens requires input object even if empty `{}`.

---

### Pattern 4: Mutation Calls

**Before:**
```typescript
await client.session.updateTitle.mutate({ sessionId, title });
await client.bash.execute.mutate({ command, mode: "active" });
```

**After:**
```typescript
await client.session.updateTitle.mutate({ sessionId, title });
await client.bash.execute.mutate({ command, mode: "active" });
```

**Note:** Mutations have same signature.

---

### Pattern 5: Subscriptions (RxJS Observable)

**Before (tRPC style):**
```typescript
const subscription = client.message.streamResponse.subscribe(
  { sessionId, userMessage },
  {
    onData: (event) => { ... },
    onError: (error) => { ... },
    onComplete: () => { ... },
  }
);
```

**After (Lens/RxJS style):**
```typescript
const subscription = client.message.streamResponse.subscribe(
  { sessionId, userMessageContent }  // Note: API param name change
).subscribe({
  next: (event) => { ... },
  error: (error) => { ... },
  complete: () => { ... },
});
```

**Key Differences:**
1. Lens returns Observable → call `.subscribe()` on it
2. `onData` → `next`
3. `onError` → `error`
4. `onComplete` → `complete`
5. Check API param names (may differ from tRPC)

---

### Pattern 6: Event Subscriptions

**Before:**
```typescript
client.events.subscribe.subscribe(
  { channel: "bash:all", fromCursor: undefined },
  {
    onData: (event) => { ... },
    onError: (err) => { ... },
  }
);
```

**After:**
```typescript
client.events.subscribe.subscribe(
  { channel: "bash:all" }  // fromCursor optional
).subscribe({
  next: (event) => { ... },
  error: (err) => { ... },
});
```

---

## Remaining Files (28)

### Hooks (Priority: High)
- [ ] `hooks/client/useEventStream.ts` - Event streaming (critical)
- [ ] `hooks/client/useAskToolHandler.ts` - Ask tool handler
- [ ] `hooks/client/useSessionInitialization.ts` - Session init
- [ ] `hooks/client/useProjectFiles.ts` - Project files
- [ ] `hooks/client/useFileAttachments.ts` - File attachments
- [ ] `hooks/client/useAIConfig.ts` - AI config
- [ ] `hooks/client/useProviders.ts` - Providers
- [ ] `hooks/client/useModels.ts` - Models
- [ ] `hooks/client/useModelDetails.ts` - Model details

### Screens (Priority: Medium)
- [ ] `screens/BashDetail.tsx` - Bash detail view
- [ ] `screens/BashList.tsx` - Bash list view
- [ ] `screens/chat/components/InputSection.tsx` - Chat input
- [ ] `screens/chat/components/ProviderManagementV2.tsx` - Provider management
- [ ] `screens/chat/hooks/useInputState.ts` - Input state
- [ ] `screens/chat/streaming/subscriptionAdapter.ts` - Subscription adapter

### Commands (Priority: Medium)
- [ ] `commands/definitions/provider.command.tsx` - Provider command
- [ ] `commands/definitions/model.command.tsx` - Model command
- [ ] `commands/definitions/compact.command.ts` - Compact command
- [ ] `commands/definitions/context.command.tsx` - Context command

### Components (Priority: Low)
- [ ] `components/tools/BashToolDisplay.tsx` - Bash tool display

### Other (Priority: Low)
- [ ] `App.tsx` - Root app
- [ ] `index.ts` - Entry point
- [ ] `headless.ts` - Headless mode
- [ ] `test-harness.ts` - Test harness
- [ ] `utils/refetch-session.ts` - Session refetch
- [ ] `hooks/input-manager/handlers/FileNavigationModeHandler.ts` - File nav
- [ ] `completions/model.ts` - Model completions
- [ ] `completions/provider.ts` - Provider completions

---

## Migration Checklist (Per File)

1. [ ] Update imports:
   - Replace `getTRPCClient` with `getLensClient`
   - Replace `useTRPCClient` with `useLensClient`
   - Add `import type { API } from "@sylphx/code-api"`

2. [ ] Update client initialization:
   - `getTRPCClient()` → `getLensClient<API>()`
   - `useTRPCClient()` → `useLensClient<API>()`

3. [ ] Update API calls:
   - Check for empty input: `.query()` → `.query({})`
   - Update param names if changed (check Lens API definition)

4. [ ] Update subscriptions (if any):
   - Add extra `.subscribe()` call
   - `onData` → `next`
   - `onError` → `error`
   - `onComplete` → `complete`

5. [ ] Test the file:
   - Ensure it compiles
   - Ensure runtime behavior is correct

6. [ ] Commit:
   - Use descriptive commit message
   - Reference Phase 5

---

## Common Issues

### Issue 1: Empty Input Required

**Error:**
```
Expected 1 argument, but got 0
```

**Fix:**
```typescript
// Before
client.bash.list.query()

// After
client.bash.list.query({})
```

---

### Issue 2: Param Name Changed

**Error:**
```
Property 'userMessage' does not exist...
```

**Fix:**
Check the Lens API definition in `packages/code-api/src/api.ts` for correct param names.

**Example:**
```typescript
// tRPC
{ userMessage: message }

// Lens
{ userMessageContent: message }
```

---

### Issue 3: Double Subscribe

**Error:**
```
Property 'subscribe' does not exist on type 'Promise'
```

**Fix:**
Lens returns Observable, need to call `.subscribe()` on it:

```typescript
// Before (tRPC)
client.events.subscribe.subscribe({ channel }, { onData: ... })

// After (Lens) - note the extra .subscribe()
client.events.subscribe.subscribe({ channel }).subscribe({ next: ... })
```

---

## API Reference

Full API available in: `packages/code-api/src/api.ts`

### session API
- `getRecent` - Get recent sessions
- `getById` - Get session by ID (with subscribe)
- `getCount` - Get session count
- `getLast` - Get last session
- `search` - Search sessions
- `create` - Create session
- `updateTitle` - Update title
- `updateModel` - Update model
- `updateProvider` - Update provider
- `updateRules` - Update rules
- `updateAgent` - Update agent
- `delete` - Delete session
- `compact` - Compact session

### message API
- `streamResponse` - Stream AI response (with subscribe)

### todo API
- `update` - Update todos

### file API
- `upload` - Upload file
- `download` - Download file
- `getMetadata` - Get file metadata

### bash API
- `execute` - Execute bash command
- `list` - List processes
- `get` - Get process info
- `kill` - Kill process
- `demote` - Demote to background
- `promote` - Promote to active
- `getActive` - Get active process
- `getActiveQueueLength` - Get queue length

### admin API
- `deleteAllSessions` - Delete all sessions
- `getSystemStats` - Get system stats
- `getHealth` - Get health status
- `forceGC` - Force garbage collection
- `getAPIInventory` - Get API inventory
- `getAPIDocs` - Get API docs

### events API
- `subscribe` - Subscribe to channel
- `subscribeToSession` - Subscribe to session
- `subscribeToAllSessions` - Subscribe to all sessions
- `getChannelInfo` - Get channel info
- `cleanupChannel` - Cleanup channel

### config API
- `load` - Load config
- `getPaths` - Get config paths
- `getProviders` - Get providers
- `getProviderSchema` - Get provider schema
- `getTokenizerInfo` - Get tokenizer info
- `countTokens` - Count tokens
- `countFileTokens` - Count file tokens
- `scanProjectFiles` - Scan project files
- `getModelDetails` - Get model details
- `fetchModels` - Fetch models
- `updateDefaultProvider` - Update default provider
- `updateDefaultModel` - Update default model
- `updateProviderConfig` - Update provider config
- `setProviderSecret` - Set provider secret
- `removeProvider` - Remove provider
- `save` - Save config
- `updateRules` - Update rules

---

## Next Steps

1. Migrate high-priority hooks first (useEventStream, useAskToolHandler, etc.)
2. Then screens and commands
3. Finally other files
4. Remove tRPC routers when all files migrated
5. Remove tRPC dependencies
6. Clean up old code

---

## After All Migrations

### Remove tRPC Infrastructure

1. **Remove tRPC Routers:**
   - `packages/code-server/src/trpc/routers/session.router.ts`
   - `packages/code-server/src/trpc/routers/message.router.ts`
   - `packages/code-server/src/trpc/routers/todo.router.ts`
   - `packages/code-server/src/trpc/routers/file.router.ts`
   - `packages/code-server/src/trpc/routers/bash.router.ts`
   - `packages/code-server/src/trpc/routers/admin.router.ts`
   - `packages/code-server/src/trpc/routers/events.router.ts` ⚠️ Already deprecated
   - `packages/code-server/src/trpc/routers/config.router.ts`
   - `packages/code-server/src/trpc/routers/index.ts`

2. **Remove tRPC Server Setup:**
   - `packages/code-server/src/trpc/trpc.ts`
   - `packages/code-server/src/trpc/context.ts`

3. **Remove TRPCProvider:**
   - `packages/code-client/src/trpc-provider.tsx`
   - Remove from App.tsx

4. **Remove tRPC Dependencies:**
   ```bash
   npm uninstall @trpc/server @trpc/client @trpc/react-query
   ```

5. **Update Exports:**
   - Remove `getTRPCClient`, `useTRPCClient` from code-client
   - Keep only Lens exports

---

**Status:** 4/32 files migrated (12.5%)
**Next:** Migrate remaining 28 files using patterns above
