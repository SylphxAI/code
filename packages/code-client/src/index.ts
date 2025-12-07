/**
 * @sylphx/code-client
 * Framework-agnostic client utilities
 *
 * This package provides:
 * - Lens client factory (createCodeClient)
 * - Transport re-exports (direct, http)
 * - Framework-agnostic state management (signals)
 * - Utility functions
 * - Shared types
 *
 * React hooks are now in the TUI package (packages/code/src/hooks/client/)
 */

// ============================================================================
// Lens Client (Type-safe, transport-agnostic)
// ============================================================================
export {
	// Factory
	createCodeClient,
	// Global client (module singleton)
	getClient,
	initClient,
	isClientInitialized,
	// React hooks (backward compatibility)
	useLensClient,
	LensProvider,
	useQuery,
	// Transports
	direct,
	http,
	// Types
	type CodeClient,
	type DirectTransportOptions,
	type HttpTransportOptions,
	type LensServerInterface,
	type Transport,
} from "./lens.js";

// Backward compatibility aliases
export { useLensClient as useTRPCClient } from "./lens.js";

// ============================================================================
// Types (re-exported from dependencies)
// ============================================================================
export type { MessagePart, Session } from "@sylphx/code-core";

// ============================================================================
// Event Bus (Re-exported from code-core to prevent circular dependency)
// ============================================================================
// Re-export shared utilities from @sylphx/code-core (via main export)
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

// API functions
export { getLastSession, getRecentSessions } from "./api/sessions.js";

// Cross-domain computed signals
export * from "./signals/computed/index.js";
export * from "./signals/domain/ai/index.js";
export * from "./signals/domain/files/index.js";
export * from "./signals/domain/queue/index.js";
export * from "./signals/domain/session/index.js";
export * from "./signals/domain/settings/index.js";
export * from "./signals/domain/theme/index.js";
export * from "./signals/domain/providers/index.js";
export * from "./signals/domain/models/index.js";
export * from "./signals/domain/mcp/index.js";
export * from "./signals/domain/bash/index.js";

// ============================================================================
// Optimistic Updates
// ============================================================================
export * from "./optimistic/index.js";

// ============================================================================
// Screen Type (for backwards compatibility in component imports)
// ============================================================================
export type { Screen } from "./signals/domain/ui/index.js";

// ============================================================================
// State Management (Zen Signals)
// ============================================================================
// Domain signals
export * from "./signals/domain/ui/index.js";
// Effects
export * from "./signals/effects/index.js";
// Event system
export * from "./signals/events/index.js";

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
// Client-specific utilities
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
