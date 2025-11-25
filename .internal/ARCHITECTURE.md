# Architecture Overview

**Last Updated**: 2025-01-XX
**Status**: Living Document

---

## 🏗️ System Architecture

### Layer Separation

```
┌─────────────────────────────────────────┐
│           UI Layer (code)               │
│  - TUI Interface (Ink + React)          │
│  - Command System                       │
│  - Streaming Display                    │
└─────────────────────────────────────────┘
                    ↓ Lens (auto-optimistic)
┌─────────────────────────────────────────┐
│      Application Layer (code-server)    │
│  - Lens API (code-api)                  │
│  - Business Logic Services              │
│  - Event Stream (Multi-client sync)     │
│  - AppContext (DI Container)            │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│        SDK Layer (code-core)            │
│  - Pure Functions (no state)            │
│  - Repositories (data access)           │
│  - AI Streaming                         │
│  - Token Calculation                    │
│  - Model/Provider Registry              │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Infrastructure Layer            │
│  - Database (SQLite via Drizzle)        │
│  - File System (Config, Agents, Rules)  │
│  - AI Providers (Anthropic, OpenAI)     │
│  - MCP Servers (External tools)         │
└─────────────────────────────────────────┘
```

---

## 📦 Package Structure

### code-core (SDK/Library)
**Purpose**: Headless SDK with all business logic
**Characteristics**:
- ✅ Pure functions (no global state)
- ✅ No UI dependencies
- ✅ No process.cwd() calls
- ✅ Testable in isolation

**Key Modules**:
- `ai/` - AI streaming, providers, system messages
- `database/` - Repositories (Session, Message, Todo)
- `registry/` - Model, Tool, Credential, MCP registries
- `config/` - AI config, settings, credentials
- `tools/` - Tool implementations (filesystem, shell, search)
- `utils/` - Helpers (token counter, session title, etc.)

### code-api (API Definition)
**Purpose**: Lens API definitions with automatic optimistic updates
**Characteristics**:
- ✅ Type-safe API with Zod schemas
- ✅ Declarative `.optimistic()` on mutations
- ✅ Field selection support
- ✅ Frontend-driven architecture

**Key Features**:
- `session.*` - Session CRUD, streaming
- `message.*` - Message operations, streaming
- `config.*` - Configuration management
- `events.*` - Real-time subscriptions

### code-server (Application Layer)
**Purpose**: Backend server with Lens API implementation
**Characteristics**:
- ✅ Stateful services (via AppContext)
- ✅ Event stream for multi-client sync
- ✅ Dependency injection
- ✅ Business logic orchestration

**Key Modules**:
- `services/` - Business logic services
- `context.ts` - AppContext (DI container)
- `server.ts` - HTTP server setup

### code (TUI Application)
**Purpose**: Terminal user interface
**Characteristics**:
- ✅ Presentation layer only
- ✅ No business logic
- ✅ Lens client for server communication (auto-optimistic)

**Key Modules**:
- `screens/` - UI screens
- `commands/` - Command definitions
- `hooks/` - React hooks for state

### code-client (Client State)
**Purpose**: Shared client-side state management
**Characteristics**:
- ✅ Zen signals for reactive state
- ✅ Lens client setup with OptimisticManager
- ✅ Automatic optimistic updates
- ✅ No manual optimistic handling needed

---

## 🔄 Data Flow Patterns

### 1. AI Streaming Flow

```
User Input → tRPC subscription → StreamingService
                ↓
        Observable<StreamEvent>
                ↓
    ┌───────────┴───────────┐
    ↓                       ↓
Event Stream          Direct Subscriber
(Multi-client)        (Originating client)
    ↓                       ↓
All Clients            Client UI Update
```

**Key Principles**:
- Streaming uses Observable pattern (tRPC subscription)
- Events published to event stream for multi-client sync
- Originating client gets direct stream (low latency)
- Other clients get events from event stream (real-time sync)

### 2. Token Calculation Flow

```
UI Request → tRPC query → Token Calculator
                ↓
        Dynamic Calculation
    (No DB cache, content-based cache)
                ↓
        ┌───────┴───────┐
        ↓               ↓
    Base Context    Message Tokens
    (cached)        (cached per message)
        ↓               ↓
        └───────┬───────┘
                ↓
          Total Tokens
                ↓
          Event Stream
        (session-tokens-updated)
                ↓
          All Clients
```

**Key Principles**:
- No database cache (volatile state)
- Content-based caching (SHA256 hashing)
- Real-time recalculation on state change
- Event-driven updates for multi-client sync

### 3. Session Management Flow

```
User Action → tRPC mutation → Session Repository
                                    ↓
                            Database Update
                                    ↓
                            Event Emission
                (session-created, session-updated, etc.)
                                    ↓
                            Event Stream
                                    ↓
                            All Clients
```

---

## 🎯 Key Design Decisions

### Decision 1: Event-Driven Architecture
**Rationale**: Multi-client real-time sync requirement
**Trade-off**: Complexity vs responsiveness
**Chosen**: Event stream with channel-based routing

### Decision 2: No Database Token Cache
**Rationale**: Token counts are volatile (agent/rules/model changes)
**Trade-off**: Performance vs correctness
**Chosen**: Dynamic calculation with content-based caching

### Decision 3: AppContext Pattern (DI)
**Rationale**: Testability and separation of concerns
**Trade-off**: Boilerplate vs flexibility
**Chosen**: Functional composition with closures

### Decision 4: Pure Functions in SDK
**Rationale**: Reusability and testability
**Trade-off**: Convenience vs maintainability
**Chosen**: No global state in code-core

### Decision 5: Observable Streaming
**Rationale**: Native tRPC subscription support
**Trade-off**: RxJS complexity vs type safety
**Chosen**: tRPC Observable (simple, type-safe)

---

## 🚨 Anti-Patterns to Avoid

### ❌ Global Mutable State
```typescript
// BAD
let currentSession: Session | null = null;

// GOOD
class SessionService {
  constructor(private repository: SessionRepository) {}
  async getSession(id: string) {
    return this.repository.getById(id);
  }
}
```

### ❌ Direct Process Dependencies
```typescript
// BAD
const cwd = process.cwd();

// GOOD
interface AppConfig {
  cwd: string;
}
function loadAgents(config: AppConfig) {
  // Use config.cwd
}
```

### ❌ TTL-Based Caching for Volatile Data
```typescript
// BAD
cache.set(key, value, { ttl: 300000 }); // 5 min

// GOOD
const hash = createHash('sha256').update(content).digest('hex');
cache.set(`${model}:${hash}`, value); // Content-based
```

### ❌ Multiple Calculation Logic
```typescript
// BAD
// In StatusBar
const tokens = session.totalTokens; // From DB

// In /context command
const tokens = calculateTokens(session); // Calculated

// GOOD - Single source (SSOT)
const tokens = await calculateTotalTokens(session, model, agent, rules);
```

---

## 📊 Performance Characteristics

### Token Calculation (with caching)
- **Base context** (first time): ~700ms
- **Base context** (cached): <1ms (>99% cache hit rate)
- **Message tokens** (first time): ~30ms per message
- **Message tokens** (cached): <1ms per message
- **Total** (100 messages, cached): ~100ms

### Event Stream Latency
- **Same process**: <10ms
- **Cross-client** (same machine): <50ms
- **Cross-client** (network): <500ms (target)

### Streaming Response
- **First token**: ~500-2000ms (provider dependent)
- **Token delta**: <50ms
- **Tool execution**: 100-5000ms (tool dependent)

---

## 🔒 Security Considerations

### Credential Management
- ✅ Encrypted storage (AES-256-GCM)
- ✅ Never log API keys
- ✅ Masked display in UI
- ✅ Per-provider scoping

### File Access
- ✅ CWD scoping (no arbitrary path access)
- ✅ Symlink protection
- ✅ File size limits
- ✅ MIME type validation

### Command Execution
- ✅ Sandboxing (via tools)
- ✅ Timeout limits
- ✅ Resource quotas
- ✅ Audit logging

---

## 🧪 Testing Strategy

### Unit Tests
- Pure functions in code-core
- Repository methods (with in-memory DB)
- Token calculation logic
- Event emission

### Integration Tests
- tRPC endpoints
- Streaming service
- Multi-client sync
- Database migrations

### E2E Tests
- Full user workflows
- Cross-client sync
- Error recovery
- Performance benchmarks

---

## 📂 Session Management Architecture

### Database Sessions (Primary - Production Use)

**Location**: `code-core/src/database/session-repository.ts`

**Purpose**: Main application sessions for TUI and Web GUI

**Storage**: SQLite database (via Drizzle ORM)

**Features**:
- ✅ Multi-step messages (AI SDK v5 streaming)
- ✅ File references (normalized storage via file_contents table)
- ✅ System messages (dynamic LLM hints)
- ✅ Metadata (agent, rules, model, timestamps)
- ✅ Token usage tracking
- ✅ Message status (active, completed, error, abort)

**Data Model**:
```typescript
interface DatabaseSession {
  id: string;
  provider: string;
  model: string;
  agentId: string;
  enabledRuleIds: string[];
  messages: SessionMessage[];  // Complex: multi-step, file-refs
  created: number;
  updated: number;
}
```

**When to Use**: All new development, TUI, Web GUI, multi-client scenarios

---

### File Sessions (Legacy - Deprecated)

**Location**: `code-core/src/utils/legacy-session-manager.ts`

**Purpose**: Backward compatibility for headless mode only

**Storage**: JSON files in `~/.sylphx/sessions/`

**Features**:
- ⚠️ Simple message array (no multi-step)
- ⚠️ No file references (inline base64 only)
- ⚠️ No system messages
- ⚠️ Limited metadata

**When to Use**: ❌ DO NOT use for new features (migration/compatibility only)

---

## 📚 Related Documents

- [REQUIREMENTS.md](REQUIREMENTS.md) - User stories and requirements
- [REFACTORING-PLAN.md](REFACTORING-PLAN.md) - Ongoing refactoring tasks
- [API.md](API.md) - tRPC API reference (TBD)

---

## 🔄 Evolution History

### v1.0 (Current)
- Three-layer architecture (UI, Application, SDK)
- Event-driven multi-client sync
- Content-based token caching
- AppContext dependency injection

### Planned Improvements
- [ ] Service layer refactoring (streaming.service.ts → smaller services)
- [ ] Unified cache management
- [ ] Consistent error handling
- [ ] Remove all `any` types
- [ ] Archive empty legacy files
