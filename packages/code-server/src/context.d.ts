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
import { type BashManagerV2, MessageRepository, SessionRepository, TodoRepository } from "@sylphx/code-core";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { type AppEventStream } from "./services/app-event-stream.service.js";
export interface DatabaseConfig {
    url?: string;
    authToken?: string;
}
export interface AppConfig {
    database?: DatabaseConfig;
    cwd: string;
}
export interface DatabaseService {
    initialize(): Promise<void>;
    getRepository(): SessionRepository;
    getMessageRepository(): MessageRepository;
    getTodoRepository(): TodoRepository;
    getDB(): DrizzleD1Database<any>;
}
export interface AgentManagerService {
    initialize(): Promise<void>;
    getAll(): Agent[];
    getById(id: string): Agent | null;
    reload(): Promise<void>;
}
export interface RuleManagerService {
    initialize(): Promise<void>;
    getAll(): Rule[];
    getById(id: string): Rule | null;
    getEnabled(enabledIds: string[]): Rule[];
    reload(): Promise<void>;
}
export interface AppContext {
    database: DatabaseService;
    agentManager: AgentManagerService;
    ruleManager: RuleManagerService;
    eventStream: AppEventStream;
    bashManagerV2: BashManagerV2;
    config: AppConfig;
}
/**
 * Create app context with all services
 * Services are lazy-initialized via closures
 */
export declare function createAppContext(config: AppConfig): AppContext;
/**
 * Initialize all services in context
 * Call this once at app startup
 */
export declare function initializeAppContext(ctx: AppContext): Promise<void>;
/**
 * Close all services and cleanup
 */
export declare function closeAppContext(ctx: AppContext): Promise<void>;
//# sourceMappingURL=context.d.ts.map