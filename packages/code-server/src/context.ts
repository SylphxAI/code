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

import type { Agent, Rule } from "@sylphx/code-core";
import {
	SessionRepository,
	MessageRepository,
	TodoRepository,
	initializeDatabase,
	loadAllAgents,
	loadAllRules,
	DEFAULT_AGENT_ID,
	createStorageOps,
	getStorageConfigFromEnv,
} from "@sylphx/code-core";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { AppEventStream, initializeEventStream } from "./services/app-event-stream.service.js";
import { EventPersistence } from "./services/event-persistence.service.js";

// ============================================================================
// Types
// ============================================================================

export interface DatabaseConfig {
	url?: string;
	authToken?: string;
}

export interface AppConfig {
	database?: DatabaseConfig;
	cwd: string;
}

// ============================================================================
// Database Service API
// ============================================================================

export interface DatabaseService {
	initialize(): Promise<void>;
	getRepository(): SessionRepository;
	getMessageRepository(): MessageRepository;
	getTodoRepository(): TodoRepository;
	getDB(): DrizzleD1Database<any>;
}

function createDatabaseService(config: DatabaseConfig): DatabaseService {
	let db: any = null;
	let repository: SessionRepository | null = null;
	let messageRepository: MessageRepository | null = null;
	let todoRepository: TodoRepository | null = null;
	let initialized = false;

	const initialize = async (): Promise<void> => {
		if (initialized) return;

		db = await initializeDatabase(() => {});
		repository = new SessionRepository(db);

		// Create storage for file handling
		const storageConfig = getStorageConfigFromEnv();
		const storage = createStorageOps(storageConfig);
		messageRepository = new MessageRepository(db, storage);

		todoRepository = new TodoRepository(db);
		initialized = true;
	};

	const getRepository = (): SessionRepository => {
		if (!repository) {
			throw new Error("Database not initialized. Call context.initialize() first.");
		}
		return repository;
	};

	const getMessageRepository = (): MessageRepository => {
		if (!messageRepository) {
			throw new Error("Database not initialized. Call context.initialize() first.");
		}
		return messageRepository;
	};

	const getTodoRepository = (): TodoRepository => {
		if (!todoRepository) {
			throw new Error("Database not initialized. Call context.initialize() first.");
		}
		return todoRepository;
	};

	const getDB = (): DrizzleD1Database<any> => {
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

const FALLBACK_AGENT: Agent = {
	id: DEFAULT_AGENT_ID,
	metadata: {
		name: "Coder",
		description: "Default coding assistant",
	},
	systemPrompt: "You are a helpful coding assistant.",
	isBuiltin: true,
};

export interface AgentManagerService {
	initialize(): Promise<void>;
	getAll(): Agent[];
	getById(id: string): Agent | null;
	reload(): Promise<void>;
}

function createAgentManagerService(cwd: string): AgentManagerService {
	let agents: Map<string, Agent> = new Map();
	let initialized = false;

	const initialize = async (): Promise<void> => {
		if (initialized) return;

		const allAgents = await loadAllAgents(cwd);
		agents = new Map(allAgents.map((a) => [a.id, a]));
		initialized = true;
	};

	const getAll = (): Agent[] => {
		if (!initialized) return [FALLBACK_AGENT];
		return Array.from(agents.values());
	};

	const getById = (id: string): Agent | null => {
		if (!initialized) {
			return id === DEFAULT_AGENT_ID ? FALLBACK_AGENT : null;
		}
		return agents.get(id) || null;
	};

	const reload = async (): Promise<void> => {
		await initialize();
	};

	return {
		initialize,
		getAll,
		getById,
		reload,
	};
}

// ============================================================================
// Rule Manager Service API
// ============================================================================

export interface RuleManagerService {
	initialize(): Promise<void>;
	getAll(): Rule[];
	getById(id: string): Rule | null;
	getEnabled(enabledIds: string[]): Rule[];
	reload(): Promise<void>;
}

function createRuleManagerService(cwd: string): RuleManagerService {
	let rules: Map<string, Rule> = new Map();
	let initialized = false;

	const initialize = async (): Promise<void> => {
		if (initialized) return;

		const allRules = await loadAllRules(cwd);
		rules = new Map(allRules.map((r) => [r.id, r]));
		initialized = true;
	};

	const getAll = (): Rule[] => {
		if (!initialized) return [];
		return Array.from(rules.values());
	};

	const getById = (id: string): Rule | null => {
		if (!initialized) return null;
		return rules.get(id) || null;
	};

	const getEnabled = (enabledIds: string[]): Rule[] => {
		if (!initialized) return [];
		return enabledIds.map((id) => rules.get(id)).filter((r): r is Rule => r !== undefined);
	};

	const reload = async (): Promise<void> => {
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

// ============================================================================
// App Context - Composition Root
// ============================================================================

export interface AppContext {
	database: DatabaseService;
	agentManager: AgentManagerService;
	ruleManager: RuleManagerService;
	eventStream: AppEventStream;
	config: AppConfig;
}

/**
 * Create app context with all services
 * Services are lazy-initialized via closures
 */
export function createAppContext(config: AppConfig): AppContext {
	const database = createDatabaseService(config.database || {});
	const agentManager = createAgentManagerService(config.cwd);
	const ruleManager = createRuleManagerService(config.cwd);

	// Event stream will be initialized in initializeAppContext
	// after database is ready (needs DB for persistence)
	let eventStream: AppEventStream | undefined = undefined;

	return {
		database,
		agentManager,
		ruleManager,
		get eventStream(): AppEventStream {
			if (!eventStream) {
				throw new Error("EventStream not initialized. Call initializeAppContext() first.");
			}
			return eventStream;
		},
		set eventStream(value: AppEventStream) {
			eventStream = value;
		},
		config,
	};
}

/**
 * Initialize all services in context
 * Call this once at app startup
 */
export async function initializeAppContext(ctx: AppContext): Promise<void> {
	// 1. Initialize database first
	await (ctx.database as any).initialize();

	// 2. Initialize event stream with database persistence
	const db = ctx.database.getDB();
	const persistence = new EventPersistence(db);
	(ctx as any).eventStream = initializeEventStream(persistence);

	// 3. Initialize other services
	await (ctx.agentManager as any).initialize();
	await (ctx.ruleManager as any).initialize();
}

/**
 * Close all services and cleanup
 */
export async function closeAppContext(ctx: AppContext): Promise<void> {
	// Cleanup event stream
	if (ctx.eventStream) {
		ctx.eventStream.destroy();
	}

	// Future: Add cleanup logic for database connections, etc.
}
