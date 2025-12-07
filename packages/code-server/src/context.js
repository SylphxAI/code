/**
 * App Context - Services Provider Pattern
 * Functional composition for dependency injection
 *
 * Architecture:
 * - code-server: Application layer (this file)
 * - Services live in Context (database, managers)
 * - UI state lives in Zustand (navigation, loading)
 * - No global mutable state
 * - Type-safe composition
 */
import { bashManagerV2, createStorageOps, DEFAULT_AGENT_ID, getStorageConfigFromEnv, initializeDatabase, loadAllAgents, loadAllRules, MessageRepository, SessionRepository, TodoRepository, } from "@sylphx/code-core";
import { initializeEventStream } from "./services/app-event-stream.service.js";
import { initializeBashEventBridge } from "./services/bash-event.service.js";
import { EventPersistence } from "./services/event-persistence.service.js";
function createDatabaseService(_config) {
    let db = null;
    let repository = null;
    let messageRepository = null;
    let todoRepository = null;
    let initialized = false;
    const initialize = async () => {
        if (initialized)
            return;
        db = await initializeDatabase(() => { });
        repository = new SessionRepository(db);
        // Create storage for file handling
        const storageConfig = getStorageConfigFromEnv();
        const storage = createStorageOps(storageConfig);
        messageRepository = new MessageRepository(db, storage);
        todoRepository = new TodoRepository(db);
        initialized = true;
    };
    const getRepository = () => {
        if (!repository) {
            throw new Error("Database not initialized. Call context.initialize() first.");
        }
        return repository;
    };
    const getMessageRepository = () => {
        if (!messageRepository) {
            throw new Error("Database not initialized. Call context.initialize() first.");
        }
        return messageRepository;
    };
    const getTodoRepository = () => {
        if (!todoRepository) {
            throw new Error("Database not initialized. Call context.initialize() first.");
        }
        return todoRepository;
    };
    const getDB = () => {
        if (!db) {
            throw new Error("Database not initialized. Call context.initialize() first.");
        }
        return db;
    };
    return {
        initialize,
        getRepository,
        getMessageRepository,
        getTodoRepository,
        getDB,
    };
}
// ============================================================================
// Agent Manager Service API
// ============================================================================
const FALLBACK_AGENT = {
    id: DEFAULT_AGENT_ID,
    metadata: {
        name: "Coder",
        description: "Default coding assistant",
    },
    systemPrompt: "You are a helpful coding assistant.",
    isBuiltin: true,
};
function createAgentManagerService(cwd) {
    let agents = new Map();
    let initialized = false;
    const initialize = async () => {
        if (initialized)
            return;
        const allAgents = await loadAllAgents(cwd);
        agents = new Map(allAgents.map((a) => [a.id, a]));
        initialized = true;
    };
    const getAll = () => {
        if (!initialized)
            return [FALLBACK_AGENT];
        return Array.from(agents.values());
    };
    const getById = (id) => {
        if (!initialized) {
            return id === DEFAULT_AGENT_ID ? FALLBACK_AGENT : null;
        }
        return agents.get(id) || null;
    };
    const reload = async () => {
        await initialize();
    };
    return {
        initialize,
        getAll,
        getById,
        reload,
    };
}
function createRuleManagerService(cwd) {
    let rules = new Map();
    let initialized = false;
    const initialize = async () => {
        if (initialized)
            return;
        const allRules = await loadAllRules(cwd);
        rules = new Map(allRules.map((r) => [r.id, r]));
        initialized = true;
    };
    const getAll = () => {
        if (!initialized)
            return [];
        return Array.from(rules.values());
    };
    const getById = (id) => {
        if (!initialized)
            return null;
        return rules.get(id) || null;
    };
    const getEnabled = (enabledIds) => {
        if (!initialized)
            return [];
        return enabledIds.map((id) => rules.get(id)).filter((r) => r !== undefined);
    };
    const reload = async () => {
        await initialize();
    };
    return {
        initialize,
        getAll,
        getById,
        getEnabled,
        reload,
    };
}
/**
 * Create app context with all services
 * Services are lazy-initialized via closures
 */
export function createAppContext(config) {
    const database = createDatabaseService(config.database || {});
    const agentManager = createAgentManagerService(config.cwd);
    const ruleManager = createRuleManagerService(config.cwd);
    // Event stream will be initialized in initializeAppContext
    // after database is ready (needs DB for persistence)
    let eventStream;
    return {
        database,
        agentManager,
        ruleManager,
        get eventStream() {
            if (!eventStream) {
                throw new Error("EventStream not initialized. Call initializeAppContext() first.");
            }
            return eventStream;
        },
        set eventStream(value) {
            eventStream = value;
        },
        bashManagerV2,
        config,
    };
}
/**
 * Initialize all services in context
 * Call this once at app startup
 */
export async function initializeAppContext(ctx) {
    // 1. Initialize database first
    await ctx.database.initialize();
    // 2. Initialize event stream with database persistence
    const db = ctx.database.getDB();
    const persistence = new EventPersistence(db);
    ctx.eventStream = initializeEventStream(persistence);
    // 3. Initialize bash event bridge (connects bashManagerV2 → eventStream)
    initializeBashEventBridge(ctx);
    // 4. Initialize other services
    await ctx.agentManager.initialize();
    await ctx.ruleManager.initialize();
}
/**
 * Close all services and cleanup
 */
export async function closeAppContext(ctx) {
    // Cleanup event stream
    if (ctx.eventStream) {
        ctx.eventStream.destroy();
    }
    // Future: Add cleanup logic for database connections, etc.
}
//# sourceMappingURL=context.js.map