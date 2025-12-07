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
} from "./lens.js";

// Backward compatibility
export { useLensClient as useTRPCClient } from "./lens.js";

// ============================================================================
// Types
// ============================================================================
export type { MessagePart, Session, ProviderId } from "@sylphx/code-core";

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
export { getLastSession, getRecentSessions } from "./api/sessions.js";

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
