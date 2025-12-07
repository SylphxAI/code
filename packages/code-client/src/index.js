/**
 * @sylphx/code-client
 *
 * Lens client + utilities for Sylphx Code.
 * All server data via lens-react live queries.
 */
// ============================================================================
// Lens Client
// ============================================================================
export { createCodeClient, getClient, initClient, isClientInitialized, useLensClient, LensProvider, useQuery, direct, http, } from "./lens.js";
// Backward compatibility
export { useLensClient as useTRPCClient } from "./lens.js";
// ============================================================================
// Utilities (from code-core)
// ============================================================================
export { calculateScrollViewport, clampCursor, eventBus, getAbsoluteCursorPosition, getCursorLinePosition, getRelativePath, isDefaultCwd, moveCursorDown, moveCursorUp, pluralize, truncateString, } from "@sylphx/code-core";
// ============================================================================
// API Functions
// ============================================================================
export { getLastSession, getRecentSessions } from "./api/sessions.js";
// ============================================================================
// Optimistic Updates
// ============================================================================
export * from "./optimistic/index.js";
export { resolveProviderAndModel } from "./utils/config.js";
export { parseUserInput } from "./utils/parse-user-input.js";
export { extractFileReferences, renderTextWithTags } from "./utils/text-rendering-utils.js";
export { formatTodoChange, formatTodoCount, getTodoColor, getTodoDisplayText, getTodoIcon, isTodoBold, isTodoDimmed, isTodoStrikethrough, } from "./utils/todo-formatters.js";
// ============================================================================
// Version
// ============================================================================
export const version = "0.1.0";
//# sourceMappingURL=index.js.map