/**
 * @sylphx/code-client
 *
 * Lens client + utilities for Sylphx Code.
 * All types auto-inferred from server.
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
	direct,
	http,
	type CodeClient,
	type Transport,
} from "./lens.js";

// Backward compatibility
export { useLensClient as useTRPCClient } from "./lens.js";

// ============================================================================
// Types from code-core
// ============================================================================
export type { MessagePart, ProviderId } from "@sylphx/code-core";

// Provider and Model types (used by hooks)
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

// Bash process type (used by hooks)
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
