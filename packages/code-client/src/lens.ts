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
	(options?: TInput extends void
		? { select?: Record<string, unknown>; skip?: boolean }
		: { input?: TInput; select?: Record<string, unknown>; skip?: boolean }): {
		data: TOutput | null;
		loading: boolean;
		error: Error | null;
		refetch: () => void;
	};
	fetch: TInput extends void
		? (options?: { select?: Record<string, unknown> }) => Promise<TOutput>
		: (options?: { input?: TInput; select?: Record<string, unknown> }) => Promise<TOutput>;
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
	// Session Queries
	getSession: QueryEndpoint<{ id: string }, Session | null>;
	listSessions: QueryEndpoint<{ limit?: number; cursor?: number }, Session[]>;
	getLastSession: QueryEndpoint<void, Session | null>;
	searchSessions: QueryEndpoint<{ query: string; limit?: number }, Session[]>;
	getSessionCount: QueryEndpoint<void, number>;

	// Message Queries
	getMessage: QueryEndpoint<{ id: string }, Message | null>;
	listMessages: QueryEndpoint<{ sessionId: string; limit?: number }, Message[]>;
	getRecentUserMessages: QueryEndpoint<{ limit?: number }, UserMessageHistory[]>;
	getStep: QueryEndpoint<{ id: string }, Step | null>;
	listSteps: QueryEndpoint<{ messageId: string }, Step[]>;
	getPart: QueryEndpoint<{ id: string }, Part | null>;
	listParts: QueryEndpoint<{ stepId: string }, Part[]>;
	listTodos: QueryEndpoint<{ sessionId: string }, Todo[]>;

	// Subscription Queries
	subscribeSession: QueryEndpoint<{ id: string }, Session>;
	subscribeSessionList: QueryEndpoint<void, Session[]>;
	subscribeToSession: QueryEndpoint<{ sessionId: string; replayLast?: number }, StreamEvent>;

	// Config Queries
	loadConfig: QueryEndpoint<{ cwd?: string }, ConfigResult>;
	getProviders: QueryEndpoint<{ cwd?: string }, Record<string, ProviderInfo>>;
	getProviderSchema: QueryEndpoint<{ providerId: string }, ProviderSchemaResult>;
	fetchModels: QueryEndpoint<{ providerId: string; cwd?: string }, FetchModelsResult>;
	getTokenizerInfo: QueryEndpoint<{ model: string }, TokenizerInfo>;
	getModelDetails: QueryEndpoint<{ providerId: string; modelId: string; cwd?: string }, ModelDetailsResult>;

	// File Queries
	scanProjectFiles: QueryEndpoint<{ cwd?: string; query?: string }, { files: ProjectFile[] }>;
	countFileTokens: QueryEndpoint<{ filePath: string; model?: string }, CountTokensResult>;

	// Bash Queries
	listBash: QueryEndpoint<void, BashProcess[]>;
	getBash: QueryEndpoint<{ bashId: string }, BashProcess>;
	getActiveBash: QueryEndpoint<void, BashProcess | null>;

	// Session Mutations
	createSession: MutationEndpoint<CreateSessionInput, Session>;
	updateSession: MutationEndpoint<UpdateSessionInput, Session>;
	deleteSession: MutationEndpoint<{ id: string }, Session>;

	// Message Mutations
	sendMessage: MutationEndpoint<SendMessageInput, SendMessageResult>;
	abortStream: MutationEndpoint<{ sessionId: string }, { success: boolean }>;
	triggerStream: MutationEndpoint<TriggerStreamInput, TriggerStreamResult>;

	// Todo Mutations
	createTodo: MutationEndpoint<CreateTodoInput, Todo>;
	updateTodo: MutationEndpoint<UpdateTodoInput, Todo>;
	deleteTodo: MutationEndpoint<{ sessionId: string; id: number }, { success: boolean }>;
	syncTodos: MutationEndpoint<SyncTodosInput, Todo[]>;

	// Config Mutations
	saveConfig: MutationEndpoint<{ config: unknown; cwd?: string }, SuccessResult>;
	setProviderSecret: MutationEndpoint<SetProviderSecretInput, SuccessResult>;

	// Bash Mutations
	executeBash: MutationEndpoint<ExecuteBashInput, ExecuteBashResult>;
	killBash: MutationEndpoint<{ bashId: string }, { success: boolean; bashId: string }>;
	demoteBash: MutationEndpoint<{ bashId: string }, { success: boolean; bashId: string; mode: string }>;
	promoteBash: MutationEndpoint<{ bashId: string }, { success: boolean; bashId: string; mode: string }>;

	// File Mutations
	uploadFile: MutationEndpoint<UploadFileInput, { fileId: string }>;

	// Ask Mutations
	answerAsk: MutationEndpoint<AnswerAskInput, { success: boolean }>;

	// Dynamic access for any endpoint
	[key: string]: QueryEndpoint<any, any> | MutationEndpoint<any, any> | undefined;
}

// =============================================================================
// Entity Types
// =============================================================================

export interface Session {
	id: string;
	title: string;
	agentId: string;
	modelId?: string;
	provider?: string;
	model?: string;
	enabledRuleIds: string[];
	todos?: Todo[];
	nextTodoId: number;
	createdAt: number;
	updatedAt: number;
}

export interface Message {
	id: string;
	sessionId: string;
	role: "user" | "assistant";
	timestamp: number;
	ordering: number;
	status: "active" | "completed" | "error";
}

export interface Step {
	id: string;
	messageId: string;
	stepIndex: number;
	status: string;
}

export interface Part {
	id: string;
	stepId: string;
	ordering: number;
	type: string;
	content: unknown;
}

export interface Todo {
	id: number;
	sessionId: string;
	content: string;
	activeForm: string;
	status: "pending" | "in_progress" | "completed" | "removed";
	ordering: number;
	createdAt: number;
	completedAt?: number;
}

// =============================================================================
// Input/Output Types
// =============================================================================

export interface UserMessageHistory {
	text: string;
	files: Array<{
		fileId: string;
		relativePath: string;
		mediaType: string;
		size: number;
	}>;
}

export interface StreamEvent {
	id: string;
	cursor: { timestamp: number; sequence: number };
	channel: string;
	type: string;
	timestamp: number;
	payload: unknown;
}

export interface ConfigResult {
	success: boolean;
	config?: unknown;
	error?: string;
}

export interface ProviderInfo {
	id: string;
	name: string;
	description: string;
	isConfigured: boolean;
}

export interface ProviderSchemaResult {
	success: boolean;
	schema?: Array<{ key: string; label: string; type: string; secret?: boolean; required?: boolean }>;
	error?: string;
}

export interface FetchModelsResult {
	success: boolean;
	models?: Array<{ id: string; name: string }>;
	error?: string;
}

export interface TokenizerInfo {
	name: string;
	modelId: string;
	source: string;
}

export interface ModelDetailsResult {
	success: boolean;
	details?: {
		contextLength?: number;
		capabilities?: Record<string, boolean>;
		[key: string]: unknown;
	};
	error?: string;
}

export interface ProjectFile {
	path: string;
	name: string;
	type: string;
	size?: number;
}

export interface CountTokensResult {
	success: boolean;
	count?: number;
	error?: string;
}

export interface BashProcess {
	id: string;
	command: string;
	mode: "active" | "background";
	status: string;
	isActive?: boolean;
	startTime: number;
	endTime?: number;
	exitCode?: number;
	cwd: string;
	duration: number;
	stdout?: string;
	stderr?: string;
}

export interface CreateSessionInput {
	title?: string;
	agentId?: string;
	modelId?: string;
	provider?: string;
	model?: string;
	enabledRuleIds?: string[];
}

export interface UpdateSessionInput {
	id: string;
	title?: string;
	agentId?: string;
	modelId?: string;
	provider?: string;
	model?: string;
	enabledRuleIds?: string[];
}

export interface SendMessageInput {
	sessionId?: string | null;
	content: Array<{ type: string; content?: string; [key: string]: unknown }>;
	agentId?: string;
	provider?: string;
	model?: string;
}

export interface SendMessageResult {
	session: Session;
	userMessage: Message;
	assistantMessage: Message;
}

export interface TriggerStreamInput {
	sessionId?: string | null;
	agentId?: string;
	provider?: string;
	model?: string;
	content: Array<{ type: string; content?: string; [key: string]: unknown }>;
}

export interface TriggerStreamResult {
	success: boolean;
	sessionId: string;
	queued?: boolean;
}

export interface CreateTodoInput {
	sessionId: string;
	content: string;
	activeForm: string;
	status?: "pending" | "in_progress" | "completed";
}

export interface UpdateTodoInput {
	sessionId: string;
	id: number;
	content?: string;
	activeForm?: string;
	status?: "pending" | "in_progress" | "completed";
}

export interface SyncTodosInput {
	sessionId: string;
	todos: Array<{
		id?: number;
		content: string;
		activeForm: string;
		status: "pending" | "in_progress" | "completed";
	}>;
}

export interface SetProviderSecretInput {
	providerId: string;
	fieldName: string;
	value: string;
	cwd?: string;
}

export interface ExecuteBashInput {
	command: string;
	mode?: "active" | "background";
	cwd?: string;
	timeout?: number;
}

export interface ExecuteBashResult {
	bashId: string;
	command: string;
	mode: string;
}

export interface UploadFileInput {
	relativePath: string;
	mediaType: string;
	size: number;
	content: string;
}

export interface AnswerAskInput {
	sessionId: string;
	questionId: string;
	answers: Record<string, string | string[]>;
}

export interface SuccessResult {
	success: boolean;
	error?: string;
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
