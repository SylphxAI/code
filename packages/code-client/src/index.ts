/**
 * @sylphx/code-client
 * Framework-agnostic client utilities
 *
 * This package provides:
 * - Framework-agnostic state management (signals)
 * - Utility functions
 * - Shared types
 * - tRPC client setup
 *
 * React hooks are now in the TUI package (packages/code/src/hooks/client/)
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
// Lens Client (Type-safe, pre-configured with API)
// ============================================================================
export {
	// Type-safe client (API type baked in)
	lensClient,
	getLensClient,  // Legacy backward compat
	useLensClient,
} from "./lens-client.js";

// ============================================================================
// Lens Provider (React Context API - Low-level, use lensClient/useLensClient instead)
// ============================================================================
export {
	_initGlobalClient as _initGlobalLensClient,
	// Client factories
	createInProcessClient as createInProcessLensClient,
	createHttpClient as createHttpLensClient,
	// React Context API
	LensProvider,
	type LensProviderProps,
} from "./lens-provider.js";
// ============================================================================
// Lens HTTP Transport (for Web UI)
// ============================================================================
export { createHTTPTransport } from "./lens-http-client.js";
// ============================================================================
// Lens React Hooks (Frontend-Driven Pattern)
// ============================================================================
// WORKAROUND: Use source files to avoid bundled React 18.3.1 in dist
// Published package has React bundled instead of external, causing hook errors
export { useQuery, useMutation, useLazyQuery } from "@sylphx/lens-react/src/index.ts";
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

// ============================================================================
// Version
// ============================================================================
export const version = "0.1.0";
