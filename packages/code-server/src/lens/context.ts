/**
 * Lens Context Type Definitions
 *
 * Context is passed directly to resolvers via `ctx` parameter (tRPC-style).
 * No AsyncLocalStorage needed - Lens server handles context injection.
 *
 * Usage in resolvers:
 * ```typescript
 * .resolve(async ({ input, ctx }) => {
 *   return ctx.db.session.findUnique({ where: { id: input.id } });
 * })
 * ```
 */

import type { AppContext } from "../context.js";

// =============================================================================
// Emit Type Definition (matches lens-core/emit)
// =============================================================================

/**
 * Emit object for object outputs
 * Allows partial updates, field-level updates, etc.
 */
export interface EmitObject<T> {
	/** Emit full object (merge with current state) */
	(data: T): void;
	/** Merge partial data into current state */
	merge: (partial: Partial<T>) => void;
	/** Replace entire state */
	replace: (data: T) => void;
	/** Set a specific field value */
	set: <K extends keyof T>(field: K, value: T[K]) => void;
}

// =============================================================================
// Context Type Definition
// =============================================================================

/**
 * Lens context type
 *
 * Contains all dependencies needed by resolvers:
 * - db: Database access (Prisma-like interface)
 * - eventStream: Real-time event publishing/subscribing
 * - appContext: Full app context for advanced operations
 * - emit: Live query emit object (injected by lens-server)
 * - onCleanup: Cleanup registration (injected by lens-server)
 */
export interface LensContext {
	/** Database access */
	db: LensDB;
	/** Event stream for real-time updates */
	eventStream: LensEventStream;
	/** Full app context (for streaming, etc.) */
	appContext: AppContext;
	/** Live query emit object (injected by lens-server in live mode) */
	emit?: EmitObject<any>;
	/** Cleanup registration (injected by lens-server in live mode) */
	onCleanup?: (fn: () => void) => void;
}

/**
 * Standard CRUD interface for entities
 */
interface EntityCRUD<TId = string> {
	findUnique: (args: { where: { id: TId } }) => Promise<any>;
	findMany: (args?: {
		where?: any;
		orderBy?: any;
		take?: number;
		skip?: number;
	}) => Promise<any[]>;
	create: (args: { data: any }) => Promise<any>;
	update: (args: { where: { id: TId }; data: any }) => Promise<any>;
	delete: (args: { where: { id: TId } }) => Promise<any>;
}

/**
 * Database interface (Prisma-like)
 *
 * Provides type-safe database access.
 * Actual implementation wraps existing repositories.
 *
 * Entity sources:
 * - DB-backed: session, message, step, part, todo, stepUsage
 * - In-memory: bashProcess (BashManager)
 * - File-based: agent, rule (loaded from .ai/ directories)
 * - Config-based: provider, model, mcpServer, credential
 * - Runtime: tool (from getAISDKTools), file (FileStorage), askRequest (AskManager)
 */
export interface LensDB {
	// ==========================================================================
	// DB-backed entities (SQLite/Drizzle)
	// ==========================================================================

	session: EntityCRUD & {
		count: () => Promise<number>;
	};

	message: EntityCRUD;

	step: EntityCRUD;

	part: EntityCRUD;

	todo: {
		findMany: (args?: {
			where?: any;
			orderBy?: any;
			take?: number;
		}) => Promise<any[]>;
		create: (args: { data: any }) => Promise<any>;
		update: (args: {
			where: { sessionId: string; id: number };
			data: any;
		}) => Promise<any>;
		delete: (args: { where: { sessionId: string; id: number } }) => Promise<any>;
	};

	stepUsage: {
		findUnique: (args: { where: { stepId: string } }) => Promise<any>;
		create: (args: { data: any }) => Promise<any>;
		update: (args: { where: { stepId: string }; data: any }) => Promise<any>;
	};

	// ==========================================================================
	// In-memory entities (BashManager)
	// ==========================================================================

	bashProcess: {
		findUnique: (args: { where: { id: string } }) => Promise<any>;
		findMany: (args?: { where?: any }) => Promise<any[]>;
		// create/update/delete handled via BashManager methods
	};

	// ==========================================================================
	// File-based entities (loaded from .ai/ directories)
	// ==========================================================================

	agent: {
		findUnique: (args: { where: { id: string }; cwd?: string }) => Promise<any>;
		findMany: (args?: { cwd?: string }) => Promise<any[]>;
		// create/update/delete not supported - file-based
	};

	rule: {
		findUnique: (args: { where: { id: string }; cwd?: string }) => Promise<any>;
		findMany: (args?: { cwd?: string }) => Promise<any[]>;
		// create/update/delete not supported - file-based
	};

	// ==========================================================================
	// Config-based entities (from AI config)
	// ==========================================================================

	provider: {
		findUnique: (args: { where: { id: string }; cwd?: string }) => Promise<any>;
		findMany: (args?: { cwd?: string }) => Promise<any[]>;
	};

	model: {
		findUnique: (args: { where: { id: string; providerId: string }; cwd?: string }) => Promise<any>;
		findMany: (args: { where: { providerId: string }; cwd?: string }) => Promise<any[]>;
	};

	mcpServer: {
		findUnique: (args: { where: { id: string }; cwd?: string }) => Promise<any>;
		findMany: (args?: { cwd?: string }) => Promise<any[]>;
	};

	credential: {
		findUnique: (args: { where: { id: string } }) => Promise<any>;
		findMany: (args?: { where?: { providerId?: string } }) => Promise<any[]>;
		create: (args: { data: any }) => Promise<any>;
		delete: (args: { where: { id: string } }) => Promise<any>;
	};

	// ==========================================================================
	// Runtime entities
	// ==========================================================================

	tool: {
		findUnique: (args: { where: { id: string } }) => Promise<any>;
		findMany: (args?: { where?: { source?: string; mcpServerId?: string } }) => Promise<any[]>;
	};

	file: {
		findUnique: (args: { where: { id: string } }) => Promise<any>;
		findMany: (args?: { where?: { sessionId?: string } }) => Promise<any[]>;
		create: (args: { data: any }) => Promise<any>;
		delete: (args: { where: { id: string } }) => Promise<any>;
	};

	askRequest: {
		findUnique: (args: { where: { id: string } }) => Promise<any>;
		findMany: (args?: { where?: { sessionId?: string; status?: string } }) => Promise<any[]>;
		create: (args: { data: any }) => Promise<any>;
		update: (args: { where: { id: string }; data: any }) => Promise<any>;
	};
}

/**
 * Stored event interface (matches event-persistence.service.ts)
 */
export interface StoredEvent<T = any> {
	id: string;
	cursor: { timestamp: number; sequence: number };
	channel: string;
	type: string;
	timestamp: number;
	payload: T;
}

/**
 * Event stream interface
 *
 * Provides pub/sub for real-time updates.
 */
export interface LensEventStream {
	publish: (channel: string, event: any) => Promise<void>;
	subscribe: (channel: string) => AsyncIterable<{ payload: any }>;
	subscribeWithHistory: (channel: string, lastN: number) => AsyncIterable<StoredEvent>;
}
