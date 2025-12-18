/**
 * @sylphx/code-client
 *
 * Shared Lens client for TUI and GUI.
 * Browser-safe - no Node.js dependencies.
 * Types auto-inferred from server's AppRouter.
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
	httpSse,
	sse,
	routeByType,
	type CodeClient,
	type Transport,
} from "./lens.js";

// ============================================================================
// Types
// ============================================================================

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
// Command Types (browser-safe - type-only imports)
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
// Event Bus (TUI-only - for cross-component events)
// ============================================================================
export { eventBus } from "./lib/event-bus.js";

// ============================================================================
// Utilities (browser-safe - no Node.js deps)
// ============================================================================
export type { ParsedContentPart, ParsedUserInput } from "./utils/parse-user-input.js";
export { parseUserInput } from "./utils/parse-user-input.js";

export type { ProviderModelResult } from "./utils/config.js";
export { resolveProviderAndModel } from "./utils/config.js";

export { extractFileReferences } from "./utils/text-utils.js";

// Note: renderTextWithTags is TUI-only (uses ink) - import directly from ./utils/text-rendering-utils.js

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
