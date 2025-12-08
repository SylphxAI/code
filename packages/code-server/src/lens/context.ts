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
 * Database interface (Prisma-like)
 *
 * Provides type-safe database access.
 * Actual implementation wraps existing repositories.
 */
export interface LensDB {
	session: {
		findUnique: (args: { where: { id: string } }) => Promise<any>;
		findMany: (args?: {
			where?: any;
			orderBy?: any;
			take?: number;
		}) => Promise<any[]>;
		create: (args: { data: any }) => Promise<any>;
		update: (args: { where: { id: string }; data: any }) => Promise<any>;
		delete: (args: { where: { id: string } }) => Promise<any>;
		count: () => Promise<number>;
	};
	message: {
		findUnique: (args: { where: { id: string } }) => Promise<any>;
		findMany: (args?: {
			where?: any;
			orderBy?: any;
			take?: number;
		}) => Promise<any[]>;
		create: (args: { data: any }) => Promise<any>;
		update: (args: { where: { id: string }; data: any }) => Promise<any>;
		delete: (args: { where: { id: string } }) => Promise<any>;
	};
	step: {
		findUnique: (args: { where: { id: string } }) => Promise<any>;
		findMany: (args?: {
			where?: any;
			orderBy?: any;
			take?: number;
		}) => Promise<any[]>;
		create: (args: { data: any }) => Promise<any>;
		update: (args: { where: { id: string }; data: any }) => Promise<any>;
	};
	part: {
		findUnique: (args: { where: { id: string } }) => Promise<any>;
		findMany: (args?: {
			where?: any;
			orderBy?: any;
			take?: number;
		}) => Promise<any[]>;
		create: (args: { data: any }) => Promise<any>;
		update: (args: { where: { id: string }; data: any }) => Promise<any>;
	};
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
