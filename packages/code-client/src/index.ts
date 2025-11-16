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
export type { AppRouter } from "@sylphx/code-server";
// Core zen exports
export { computed, get, set, subscribe, zen } from "@sylphx/zen";
// API functions
export { getLastSession, getRecentSessions } from "./api/sessions.js";
// ============================================================================
// React Hooks
// ============================================================================
export { useAIConfig as useAIConfigActions } from "./hooks/useAIConfig.js";
export { useAskToolHandler } from "./hooks/useAskToolHandler.js";
export { useChat } from "./hooks/useChat.js";
export { useCurrentSession } from "./hooks/useCurrentSession.js";
export { useElapsedTime } from "./hooks/useElapsedTime.js";
export {
	type EventStreamCallbacks,
	type UseEventStreamOptions,
	useEventStream,
} from "./hooks/useEventStream.js";
export { useFileAttachments } from "./hooks/useFileAttachments.js";
export { useKeyboard } from "./hooks/useKeyboard.js";
export { type MCPStatus, useMCPStatus } from "./hooks/useMCPStatus.js";
export { useModelDetails } from "./hooks/useModelDetails.js";
export { useModels } from "./hooks/useModels.js";
export { useMouse } from "./hooks/useMouse.js";
export { useProjectFiles } from "./hooks/useProjectFiles.js";
export { useProviders } from "./hooks/useProviders.js";
export { useSessionInitialization } from "./hooks/useSessionInitialization.js";
export { useSessionList } from "./hooks/useSessionList.js";
export {
	type SessionListSyncCallbacks,
	type UseSessionListSyncOptions,
	useSessionListSync,
} from "./hooks/useSessionListSync.js";
export { useSessionPersistence } from "./hooks/useSessionPersistence.js";
export { useTokenCalculation } from "./hooks/useTokenCalculation.js";
export { useTotalTokens } from "./hooks/useTotalTokens.js";
// Cross-domain computed signals
export * from "./signals/computed/index.js";
export * from "./signals/domain/ai/index.js";
export * from "./signals/domain/queue/index.js";
export * from "./signals/domain/session/index.js";
export * from "./signals/domain/settings/index.js";
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
// tRPC Links (Low-level, use createInProcessClient instead)
// ============================================================================
export {
	type InProcessLinkOptions,
	inProcessLink,
} from "./trpc-links/index.js";
// ============================================================================
// tRPC Provider (React Context API)
// ============================================================================
export {
	_initGlobalClient,
	createHTTPClient,
	// Client factories
	createInProcessClient,
	// Internal API for Zen signals (DO NOT USE in React components)
	getTRPCClient,
	// React Context API
	TRPCProvider,
	type TRPCProviderProps,
	type TypedTRPCClient,
	useTRPCClient,
} from "./trpc-provider.js";
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
export {
	getToolComponent,
	isBuiltInTool,
	registerTool,
	toolConfigs,
} from "./utils/tool-configs.js";

// ============================================================================
// Version
// ============================================================================
export const version = "0.1.0";
