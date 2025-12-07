/**
 * @sylphx/code-client
 *
 * Lens client + utilities for Sylphx Code.
 * All server data via lens-react live queries.
 */

// ============================================================================
// Lens Client
// ============================================================================
export {
	createCodeClient,
	getClient,
	initClient,
	isClientInitialized,
	useLensClient,
	LensProvider,
	useQuery,
	direct,
	http,
	type CodeClient,
	type DirectTransportOptions,
	type HttpTransportOptions,
	type LensServerInterface,
	type Transport,
	// Entity types
	type Session,
	type Message,
	type Step,
	type Part,
	type Todo,
	// Input/Output types
	type UserMessageHistory,
	type StreamEvent,
	type ConfigResult,
	type ProviderInfo,
	type ProviderSchemaResult,
	type FetchModelsResult,
	type TokenizerInfo,
	type ModelDetailsResult,
	type ProjectFile,
	type CountTokensResult,
	type BashProcess,
	type CreateSessionInput,
	type UpdateSessionInput,
	type SendMessageInput,
	type SendMessageResult,
	type TriggerStreamInput,
	type TriggerStreamResult,
	type CreateTodoInput,
	type UpdateTodoInput,
	type SyncTodosInput,
	type SetProviderSecretInput,
	type ExecuteBashInput,
	type ExecuteBashResult,
	type UploadFileInput,
	type AnswerAskInput,
	type SuccessResult,
} from "./lens.js";

// Backward compatibility
export { useLensClient as useTRPCClient } from "./lens.js";

// ============================================================================
// Types
// ============================================================================
// Note: Session type is exported from lens.ts (our CodeClient Session type)
// MessagePart and ProviderId come from code-core
export type { MessagePart, ProviderId } from "@sylphx/code-core";

// Provider and Model types
export interface Provider {
	id: string;
	name: string;
	isConfigured: boolean;
}

export interface ModelInfo {
	id: string;
	name: string;
	contextWindow?: number;
	maxOutputTokens?: number;
}

// ============================================================================
// Utilities (from code-core)
// ============================================================================
export {
	type AppEvents,
	calculateScrollViewport,
	clampCursor,
	eventBus,
	type FormattedResult,
	getAbsoluteCursorPosition,
	getCursorLinePosition,
	getRelativePath,
	type InputFormatter,
	isDefaultCwd,
	type LinePosition,
	moveCursorDown,
	moveCursorUp,
	pluralize,
	type ResultFormatter,
	type ScrollViewportResult,
	truncateString,
} from "@sylphx/code-core";

// ============================================================================
// API Functions
// ============================================================================
export { getLastSession, getRecentSessions, type SessionListItem } from "./api/sessions.js";

// ============================================================================
// Optimistic Updates
// ============================================================================
export * from "./optimistic/index.js";

// ============================================================================
// Command Types
// ============================================================================
export type {
	Command,
	CommandArg,
	CommandContext,
	Question,
	SelectOption,
	WaitForInputOptions,
} from "./types/command-types.js";
export type { ToolConfig, ToolDisplayProps } from "./types/tool.types.js";

// ============================================================================
// Utilities
// ============================================================================
export type { ProviderModelResult } from "./utils/config.js";
export { resolveProviderAndModel } from "./utils/config.js";
export type { ParsedContentPart, ParsedUserInput } from "./utils/parse-user-input.js";
export { parseUserInput } from "./utils/parse-user-input.js";
export { extractFileReferences, renderTextWithTags } from "./utils/text-rendering-utils.js";
export {
	formatTodoChange,
	formatTodoCount,
	getTodoColor,
	getTodoDisplayText,
	getTodoIcon,
	isTodoBold,
	isTodoDimmed,
	isTodoStrikethrough,
} from "./utils/todo-formatters.js";

// ============================================================================
// Version
// ============================================================================
export const version = "0.1.0";
