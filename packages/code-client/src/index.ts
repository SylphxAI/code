/**
 * @sylphx/code-client
 * Shared React code for Web and TUI clients
 *
 * This package provides:
 * - State management (Zen signals)
 * - React hooks for common operations
 * - Utility functions
 * - Shared types
 */

// ============================================================================
// tRPC Provider (React Context API)
// ============================================================================
export {
	// React Context API
	TRPCProvider,
	useTRPCClient,
	type TRPCProviderProps,
	// Client factories
	createInProcessClient,
	createHTTPClient,
	type TypedTRPCClient,
	// Internal API for Zen signals (DO NOT USE in React components)
	getTRPCClient,
	_initGlobalClient,
} from "./trpc-provider.js";

// ============================================================================
// tRPC Links (Low-level, use createInProcessClient instead)
// ============================================================================
export {
	inProcessLink,
	type InProcessLinkOptions,
} from "./trpc-links/index.js";

// ============================================================================
// State Management (Zen Signals)
// ============================================================================
// Domain signals
export * from "./signals/domain/ui/index.js";
export * from "./signals/domain/ai/index.js";
export * from "./signals/domain/session/index.js";
export * from "./signals/domain/settings/index.js";

// Cross-domain computed signals
export * from "./signals/computed/index.js";

// Event system
export * from "./signals/events/index.js";

// Effects
export * from "./signals/effects/index.js";

// Core zen exports
export { zen, computed, subscribe, get, set } from "@sylphx/zen";

// ============================================================================
// Screen Type (for backwards compatibility in component imports)
// ============================================================================
export type { Screen } from "./signals/domain/ui/index.js";

// ============================================================================
// Event Bus (Re-exported from code-core to prevent circular dependency)
// ============================================================================
export { eventBus, type AppEvents } from "@sylphx/code-core";

// ============================================================================
// Types (re-exported from dependencies)
// ============================================================================
export type { Session, MessagePart } from "@sylphx/code-core";
export type { AppRouter } from "@sylphx/code-server";

// ============================================================================
// Command Types
// ============================================================================
export type {
	Command,
	CommandArg,
	CommandContext,
	SelectOption,
	Question,
	WaitForInputOptions,
} from "./types/command-types.js";

// ============================================================================
// React Hooks
// ============================================================================
export { useAIConfig as useAIConfigActions } from "./hooks/useAIConfig.js";
export { useAskToolHandler } from "./hooks/useAskToolHandler.js";
export { useChat } from "./hooks/useChat.js";
export { useCurrentSession } from "./hooks/useCurrentSession.js";
export { useElapsedTime } from "./hooks/useElapsedTime.js";
export {
	useEventStream,
	type EventStreamCallbacks,
	type UseEventStreamOptions,
} from "./hooks/useEventStream.js";
export { useFileAttachments } from "./hooks/useFileAttachments.js";
export { useKeyboard } from "./hooks/useKeyboard.js";
export { useModelDetails } from "./hooks/useModelDetails.js";
export { useModels } from "./hooks/useModels.js";
export { useMouse } from "./hooks/useMouse.js";
export { useProjectFiles } from "./hooks/useProjectFiles.js";
export { useProviders } from "./hooks/useProviders.js";
export { useSessionInitialization } from "./hooks/useSessionInitialization.js";
export { useSessionPersistence } from "./hooks/useSessionPersistence.js";
export { useTokenCalculation } from "./hooks/useTokenCalculation.js";
export { useTotalTokens } from "./hooks/useTotalTokens.js";
export { useSessionList } from "./hooks/useSessionList.js";
export {
	useSessionListSync,
	type SessionListSyncCallbacks,
	type UseSessionListSyncOptions,
} from "./hooks/useSessionListSync.js";
export { useMCPStatus, type MCPStatus } from "./hooks/useMCPStatus.js";

// ============================================================================
// Utilities
// ============================================================================
export type { ProviderModelResult } from "./utils/config.js";
export { resolveProviderAndModel } from "./utils/config.js";

// API functions
export { getRecentSessions, getLastSession } from "./api/sessions.js";

// Re-export shared utilities from @sylphx/code-core (via main export)
export {
	getCursorLinePosition,
	getAbsoluteCursorPosition,
	moveCursorUp,
	moveCursorDown,
	clampCursor,
	calculateScrollViewport,
	truncateString,
	getRelativePath,
	isDefaultCwd,
	pluralize,
	type LinePosition,
	type ScrollViewportResult,
	type InputFormatter,
	type ResultFormatter,
	type FormattedResult,
} from "@sylphx/code-core";

// Client-specific utilities
export type { ParsedContentPart, ParsedUserInput } from "./utils/parse-user-input.js";
export { parseUserInput } from "./utils/parse-user-input.js";

export { renderTextWithTags, extractFileReferences } from "./utils/text-rendering-utils.js";

export {
	getTodoIcon,
	getTodoColor,
	getTodoDisplayText,
	isTodoDimmed,
	isTodoBold,
	isTodoStrikethrough,
	formatTodoChange,
	formatTodoCount,
} from "./utils/todo-formatters.js";

export type { ToolDisplayProps, ToolConfig } from "./types/tool.types.js";
export {
	toolConfigs,
	getToolComponent,
	isBuiltInTool,
	registerTool,
} from "./utils/tool-configs.js";

// ============================================================================
// Version
// ============================================================================
export const version = "0.1.0";
