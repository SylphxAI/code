/**
 * Lens Client Factory for Code Project
 *
 * Clean, type-safe lens integration following lens-react patterns.
 *
 * Architecture:
 * - @sylphx/lens-react: createClient<Router>({ transport }) → TypedClient<Router>
 * - @sylphx/lens-client: Transports (direct, http, etc.)
 * - Module singleton pattern (no Context Provider needed)
 *
 * Usage:
 * ```typescript
 * // TUI (in-process with emit support)
 * import { createCodeClient, direct, initClient } from "@sylphx/code-client";
 * const client = createCodeClient(direct({ app: lensServer }));
 * initClient(client); // Register for global access
 *
 * // Web (HTTP transport)
 * import { createCodeClient, http, initClient } from "@sylphx/code-client";
 * const client = createCodeClient(http({ url: "/api/lens" }));
 * initClient(client); // Register for global access
 *
 * // React components (hooks):
 * const { data, loading } = client.getSession({ id });
 *
 * // Promise-based (SSR, utilities, signals):
 * const session = await client.getSession.fetch({ id });
 *
 * // From signals (after initialization):
 * import { getClient } from "@sylphx/code-client";
 * const client = getClient();
 * ```
 */

import { createClient } from "@sylphx/lens-react";
import {
	direct,
	http,
	type DirectTransportOptions,
	type HttpTransportOptions,
	type LensServerInterface,
	type Transport,
} from "@sylphx/lens-client";

// =============================================================================
// Types
// =============================================================================

/**
 * Query endpoint interface
 * Callable as hook (in React components) or via .fetch() for promises
 */
interface QueryEndpoint<TInput = unknown, TOutput = unknown> {
	(options?: { input?: TInput; select?: Record<string, unknown>; skip?: boolean }): {
		data: TOutput | null;
		loading: boolean;
		error: Error | null;
		refetch: () => void;
	};
	fetch: (options?: { input?: TInput; select?: Record<string, unknown> }) => Promise<TOutput>;
}

/**
 * Mutation endpoint interface
 * Callable as hook or via .fetch() for promises
 */
interface MutationEndpoint<TInput = unknown, TOutput = unknown> {
	(options?: { onSuccess?: (data: TOutput) => void; onError?: (error: Error) => void }): {
		mutate: (options: { input: TInput }) => Promise<TOutput>;
		loading: boolean;
		error: Error | null;
		data: TOutput | null;
	};
	fetch: (options: { input: TInput }) => Promise<TOutput>;
}

/**
 * Type-safe Lens client for Code API
 *
 * Note: Type inference from LensRouter._types is not working due to
 * bundler not preserving return types. Using dynamic client type for now.
 * Runtime behavior is correct - lens-client creates proxies dynamically.
 *
 * All endpoints can be accessed as:
 * - client.endpointName({ input }) - React hook
 * - client.endpointName.fetch({ input }) - Promise (SSR/signals)
 */
export interface CodeClient {
	// Queries
	getSession: QueryEndpoint;
	listSessions: QueryEndpoint;
	getLastSession: QueryEndpoint;
	searchSessions: QueryEndpoint;
	getSessionCount: QueryEndpoint;
	getMessage: QueryEndpoint;
	listMessages: QueryEndpoint;
	getRecentUserMessages: QueryEndpoint;
	getStep: QueryEndpoint;
	listSteps: QueryEndpoint;
	getPart: QueryEndpoint;
	listParts: QueryEndpoint;
	listTodos: QueryEndpoint;
	subscribeSession: QueryEndpoint;
	subscribeSessionList: QueryEndpoint;
	subscribeToSession: QueryEndpoint;
	loadConfig: QueryEndpoint;
	getProviders: QueryEndpoint;
	getProviderSchema: QueryEndpoint;
	fetchModels: QueryEndpoint;
	scanProjectFiles: QueryEndpoint;
	countFileTokens: QueryEndpoint;
	listBash: QueryEndpoint;
	getBash: QueryEndpoint;
	getActiveBash: QueryEndpoint;

	// Mutations
	createSession: MutationEndpoint;
	updateSession: MutationEndpoint;
	deleteSession: MutationEndpoint;
	sendMessage: MutationEndpoint;
	abortStream: MutationEndpoint;
	createTodo: MutationEndpoint;
	updateTodo: MutationEndpoint;
	deleteTodo: MutationEndpoint;
	syncTodos: MutationEndpoint;
	saveConfig: MutationEndpoint;
	setProviderSecret: MutationEndpoint;
	executeBash: MutationEndpoint;
	killBash: MutationEndpoint;
	demoteBash: MutationEndpoint;
	promoteBash: MutationEndpoint;
	uploadFile: MutationEndpoint;
	answerAsk: MutationEndpoint;
	triggerStream: MutationEndpoint;

	// Dynamic access for any endpoint
	[key: string]: QueryEndpoint | MutationEndpoint | undefined;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a type-safe Code client with any transport
 *
 * @param transport - Transport configuration (direct, http, etc.)
 * @returns Fully typed Code client
 *
 * @example
 * ```typescript
 * // TUI with direct transport (supports emit API)
 * const client = createCodeClient(direct({ app: lensServer }));
 *
 * // Web with HTTP transport
 * const client = createCodeClient(http({ url: "/api/lens" }));
 * ```
 */
export function createCodeClient(transport: Transport): CodeClient {
	// createClient returns a dynamically-typed proxy that matches our CodeClient interface
	// The cast is safe because the proxy handles all endpoint calls at runtime
	return createClient({ transport }) as unknown as CodeClient;
}

// =============================================================================
// Transport Re-exports
// =============================================================================

export {
	// Transports
	direct,
	http,
	// Types
	type DirectTransportOptions,
	type HttpTransportOptions,
	type LensServerInterface,
	type Transport,
};

// =============================================================================
// Global Client (Module Singleton)
// =============================================================================

// Storage key for global client
const GLOBAL_CLIENT_KEY = "__lensCodeClient__" as const;

/**
 * Module-level client storage
 * Allows signals and utilities to access the client after initialization
 */
let _globalClient: CodeClient | null = null;

/**
 * Initialize the global client instance
 * Call this after creating the client to enable global access
 *
 * @param client - The created CodeClient instance
 *
 * @example
 * ```typescript
 * const client = createCodeClient(direct({ app: lensServer }));
 * initClient(client);
 * ```
 */
export function initClient(client: CodeClient): void {
	_globalClient = client;
	// Also store in globalThis for cross-module access
	(globalThis as any)[GLOBAL_CLIENT_KEY] = client;
}

/**
 * Get the global client instance
 * Throws if client not initialized
 *
 * @returns The initialized CodeClient
 * @throws Error if client not initialized via initClient()
 *
 * @example
 * ```typescript
 * const client = getClient();
 * const session = await client.getSession.fetch({ id });
 * ```
 */
export function getClient(): CodeClient {
	// Try module-level first, then globalThis
	const client = _globalClient || (globalThis as any)[GLOBAL_CLIENT_KEY];
	if (!client) {
		throw new Error(
			"Lens client not initialized. " +
				"Call initClient(createCodeClient(transport)) before using getClient().",
		);
	}
	return client;
}

/**
 * Check if client is initialized
 *
 * @returns true if client is available
 */
export function isClientInitialized(): boolean {
	return _globalClient != null || (globalThis as any)[GLOBAL_CLIENT_KEY] != null;
}

// Note: LensRouter type export removed - using explicit CodeClient interface instead
// The bundler doesn't preserve createLensServer return types, so type inference doesn't work

// =============================================================================
// React Hooks (for backward compatibility)
// =============================================================================

/**
 * React hook to get the Lens client
 * Use this in React components to access the client
 *
 * Note: This is just a function that returns getClient().
 * The actual React hooks are in lens-react's client.xxx() methods.
 *
 * @returns The initialized CodeClient
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const client = useLensClient();
 *   const { data } = client.getSession({ input: { id } });
 * }
 * ```
 */
export function useLensClient(): CodeClient {
	return getClient();
}

/**
 * LensProvider - No-op wrapper for backward compatibility
 * With module singleton pattern, no provider is needed.
 * This is kept for code that hasn't been migrated yet.
 */
export function LensProvider({ children }: { children: any }): any {
	return children;
}

/**
 * useQuery - Stub for backward compatibility
 * In lens-react v4, use client.queryName() directly as a hook
 * @deprecated Use client.queryName({ input }) directly
 */
export function useQuery<T>(
	_queryFn: () => Promise<T>,
	_deps: unknown[] = [],
): { data: T | null; loading: boolean; error: Error | null; refetch: () => void } {
	// Note: This stub exists for type compatibility
	// Actual implementations should use client.xxx() directly
	throw new Error(
		"useQuery is deprecated. Use client.xxx({ input }) directly in React components."
	);
}
