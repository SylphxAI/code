/**
 * @sylphx/code-core
 * Complete headless SDK with all business logic
 *
 * This package contains all core functionality:
 * - AI streaming and providers
 * - Session management
 * - Message handling
 * - Database layer (pure functions)
 * - Tools execution
 * - Configuration
 *
 * NOTE: This is SDK/Library layer - NO application context management
 * Application composition happens in code-server package
 */

export { loadAllAgents } from "./ai/agent-loader.js";
// ============================================================================
// Agent Management (Pure Functions)
// ============================================================================
export { DEFAULT_AGENT_ID } from "./ai/builtin-agents.js";
export { buildModelMessages } from "./ai/message-builder/index.js";
// ============================================================================
// AI & Streaming
// ============================================================================
export { processStream, type StreamCallbacks } from "./ai/stream-handler.js";
export type { SystemMessageType } from "./ai/system-messages/index.js";
// ============================================================================
// System Messages (Dynamic LLM Hints)
// ============================================================================
export {
	createSystemMessage,
	isSystemMessage,
	parseSystemMessageType,
	SystemMessages,
} from "./ai/system-messages/index.js";
export type {
	TriggerContext,
	TriggerHook,
	TriggerRegistration,
	TriggerResult,
} from "./ai/system-messages/registry.js";
export {
	checkAllTriggers,
	initializeTriggers,
	insertSystemMessage,
	triggerRegistry,
} from "./ai/system-messages/triggers.js";
// ============================================================================
// Events
// ============================================================================
export { type AppEvents, eventBus } from "./events/index.js";

// Use AgentManagerService from code-server/src/context.ts for stateful operations

// ============================================================================
// Rule Management (Pure Functions)
// ============================================================================
export { loadAllRules } from "./ai/rule-loader.js";
// ============================================================================
// System Prompt Builder
// ============================================================================
export { buildSystemPrompt } from "./ai/system-prompt-builder.js";

// Use RuleManagerService from code-server/src/context.ts for stateful operations

export { AnthropicProvider } from "./ai/providers/anthropic-provider.js";
export { ClaudeCodeProvider } from "./ai/providers/claude-code-provider.js";
export { GoogleProvider } from "./ai/providers/google-provider.js";
export type { ProviderId } from "./ai/providers/index.js";
// ============================================================================
// Providers
// ============================================================================
export { getProvider, PROVIDER_REGISTRY } from "./ai/providers/index.js";
export { KimiProvider } from "./ai/providers/kimi-provider.js";
export { OpenAIProvider } from "./ai/providers/openai-provider.js";
export { OpenRouterProvider } from "./ai/providers/openrouter-provider.js";
export { ZaiProvider } from "./ai/providers/zai-provider.js";
export { initializeDatabase } from "./database/auto-migrate.js";
export { MessageRepository } from "./database/message-repository.js";
export type { Event, NewEvent } from "./database/schema.js";
export { events } from "./database/schema.js";
// ============================================================================
// Database & Repositories (Pure Functions)
// ============================================================================
export { SessionRepository } from "./database/session-repository.js";
export {
	completeMessageStep,
	createMessageStep,
	loadMessageSteps,
	updateStepParts,
} from "./database/step-repository-helpers.js";
export { TodoRepository } from "./database/todo-repository.js";

// ============================================================================
// Storage (Functional)
// ============================================================================
export type { StorageOps } from "./storage/functional.js";
export { createStorageOps, getStorageConfigFromEnv } from "./storage/index.js";

// Use DatabaseService from code-server/src/context.ts for database access

export {
	type CompactResult,
	compactSession,
	shouldCompactSession,
} from "./ai/compact-service.js";
export { createHeadlessDisplay } from "./ai/headless-display.js";
export {
	calculateModelMessagesTokens,
	clearMessageTokenCache,
} from "./ai/model-message-token-calculator.js";
export type { ProviderConfig } from "./ai/providers/base-provider.js";
// ============================================================================
// Session Management
// ============================================================================
export {
	getOrCreateSession,
	showModelToolSupportError,
} from "./ai/session-service.js";
export { calculateBaseContextTokens, clearBaseContextCache } from "./ai/session-tokens.js";
export { StreamingTokenTracker } from "./ai/streaming-token-tracker.js";
export { TokenCalculator } from "./ai/token-calculator.js";
export type { CacheStats } from "./cache/cache-manager.js";
// ============================================================================
// Cache Management
// ============================================================================
export { cacheManager } from "./cache/cache-manager.js";
export type { AIConfig } from "./config/ai-config.js";
// ============================================================================
// Configuration
// ============================================================================
export {
	AI_PROVIDERS,
	getAIConfigPaths,
	getConfiguredProviders,
	getProviderApiKey,
	getProviderConfigWithApiKey,
	loadAIConfig,
	saveAIConfig,
} from "./config/ai-config.js";
export {
	addCredential,
	credentialsExist,
	getCredentialPaths,
	loadCredentials,
	migrateProviderConfigToCredentials,
	modifyCredential,
	removeCredential,
	saveCredentials,
} from "./config/credential-manager.js";
// MCP Configuration
export {
	addMCPServer,
	disableMCPServer,
	enableMCPServer,
	getMCPConfigPath,
	getMCPServer,
	listEnabledMCPServers,
	listMCPServers,
	loadMCPConfig,
	mcpConfigExists,
	removeMCPServer,
	saveMCPConfig,
	updateMCPServer,
	validateMCPServerConfig,
} from "./config/mcp-config.js";
export type { ToolDisplayInfo, ToolDisplaySettings } from "./config/tool-display-settings.js";
// Tool Display Settings
export {
	DEFAULT_TOOL_DISPLAY_SETTINGS,
	getAllToolDisplayInfo,
	getToolShowDetailsDefault,
	resetAllToolDisplaySettings,
	resetToolDisplaySetting,
	shouldShowToolDetails,
	updateToolDisplaySetting,
} from "./config/tool-display-settings.js";
// ============================================================================
// Entity Migration Utilities
// ============================================================================
export {
	batchMigrateMessageParts,
	batchMigrateSessions,
	batchMigrateTodos,
	getSessionMigrationStats,
	migrateAIConfig,
	migrateMessagePart,
	migrateSession,
	migrateSessionMetadata,
	migrateSessionToModelId,
	migrateTodo,
} from "./database/entity-migrations.js";
export {
	createCredential,
	deleteCredential,
	getActiveCredentials,
	getAllCredentials,
	getAllMaskedCredentials,
	getCredential,
	getCredentialStats,
	getCredentialsByProvider,
	getCredentialsByScope,
	getDefaultCredential,
	getMaskedCredential,
	hasActiveCredential,
	maskApiKey,
	updateCredential,
} from "./registry/credential-registry.js";
// MCP Tool Integration
export {
	convertAllMCPToolsToAISDK,
	convertAllMCPToolsToMetadata,
	convertMCPToolToAISDK,
	convertMCPToolToMetadata,
	getAllMCPTools,
	getMCPTool,
	getMCPToolCountByServer,
	getMCPToolsByServerId,
	isMCPTool,
	loadMCPTools,
	parseMCPToolId,
	registerMCPTool,
	reloadMCPServerTools,
	unregisterMCPServerTools,
	unregisterMCPTool,
} from "./registry/mcp-tool-integration.js";
export {
	getDefaultModelIdForProvider,
	getProviderIdFromModelId,
	migrateSessionModel,
	migrateToModelId,
} from "./registry/model-migration.js";

// ============================================================================
// Model Registry (Normalized Model System)
// ============================================================================
export {
	getAllModels,
	getAllProviders,
	getModel,
	getModelsByProvider,
	getModelWithProvider,
	getProviderEntity,
	MODELS,
	modelSupportsInput,
	modelSupportsOutput,
	PROVIDERS,
} from "./registry/model-registry.js";
// ============================================================================
// Tool Registry (Normalized Tool System)
// ============================================================================
export {
	getAllCategories,
	getAllTools,
	getCategory,
	getDangerousTools,
	getSafeTools,
	getTool,
	getToolsByCategory,
	getToolsBySecurityLevel,
	getToolsSupportedByModel,
	isToolSupportedByModel,
	TOOL_CATEGORIES,
	TOOLS,
} from "./registry/tool-registry.js";
export { cleanAITitle, formatSessionDisplay } from "./session/utils/index.js";
export type * from "./types/common.types.js";
// ============================================================================
// Credential Management (Normalized Credential System)
// ============================================================================
export type * from "./types/credential.types.js";
export type * from "./types/interaction.types.js";
export type * from "./types/mcp.types.js";
export type * from "./types/model.types.js";
// ============================================================================
// Types
// ============================================================================
export type * from "./types/agent.types.js";
export type * from "./types/rule.types.js";
export type * from "./types/session.types.js";
export type * from "./types/streaming-events.types.js";
export type * from "./types/todo.types.js";
export type * from "./types/tool.types.js";
export { fetchModels, type ModelInfo } from "./utils/ai-model-fetcher.js";
// Context Reserve Calculator
export {
	calculateReservedTokens,
	calculateReservePercent,
	DEFAULT_CONTEXT_RESERVE_RATIO,
	getReserveBreakdown,
	getSummaryMaxTokens,
} from "./utils/context-reserve.js";
export {
	clampCursor,
	getAbsoluteCursorPosition,
	getCursorLinePosition,
	type LinePosition,
	moveCursorDown,
	moveCursorUp,
} from "./utils/cursor-utils.js";
export { createLogger, debugLog } from "./utils/debug-logger.js";
export { formatDiffLine, formatDiffLines } from "./utils/diff-formatter.js";
export { type FileInfo, filterFiles } from "./utils/file-scanner.js";
// Legacy file-based session management (deprecated, use SessionRepository for new code)
export { addMessage } from "./utils/legacy-session-manager.js";
export {
	calculateScrollViewport,
	type ScrollViewportResult,
} from "./utils/scroll-viewport.js";
export {
	generateSessionTitle,
	generateSessionTitleWithStreaming,
} from "./utils/session-title.js";
export type { ProjectSettings } from "./utils/settings.js";
// Project Settings
export {
	getDefaultTarget,
	getSettingsPath,
	loadSettings,
	saveSettings,
	setDefaultTarget,
	settingsExists,
	updateSettings,
} from "./utils/settings.js";
// ============================================================================
// Utils
// ============================================================================
export { buildTodoContext } from "./utils/todo-context.js";
// NOTE: formatTodoChange and formatTodoCount are used internally by tools/todo.ts
// Exporting them here causes duplicate exports in the bundle. Keep them internal.
export {
	countTokens,
	formatTokenCount,
	getTokenizerInfo,
} from "./utils/token-counter.js";
export {
	type FormattedResult,
	getRelativePath,
	type InputFormatter,
	isDefaultCwd,
	pluralize,
	type ResultFormatter,
	truncateString,
} from "./utils/tool-formatters.js";

// ============================================================================
// Tools
// ============================================================================
// Export tools explicitly to avoid bundler creating duplicate export statements
// (wildcard re-exports cause bundler to generate exports in both the chunk and index)

// ============================================================================
// MCP Commands
// ============================================================================
export { MCP_COMMANDS } from "./commands/mcp-commands.js";
// ============================================================================
// Constants
// ============================================================================
export * from "./constants/index.js";
// ============================================================================
// MCP Manager Service
// ============================================================================
export { getMCPManager, MCPManager, resetMCPManager } from "./services/mcp-manager.js";
// ============================================================================
// Model Details Service
// ============================================================================
export { enrichCapabilities, enrichModelDetails } from "./services/model-details-service.js";
// Bash manager
export { bashManager } from "./tools/bash-manager.js";
export { bashManagerV2, BashManagerV2 } from "./tools/bash-manager-v2.js";
export type { BashMode, BashOutputChunk, BashProcess, BashStateChange, BashStatus } from "./tools/bash-manager-v2.js";
// Filesystem tools
export {
	editFileTool,
	filesystemTools,
	readFileTool,
	writeFileTool,
} from "./tools/filesystem.js";
// Interaction tools
export {
	askUserSelectionTool,
	clearUserInputHandler,
	getQueueLength,
	hasUserInputHandler,
	interactionTools,
	setQueueUpdateCallback,
	setUserInputHandler,
} from "./tools/interaction.js";
// Registry
export {
	type GetToolsOptions,
	getAISDKTools,
	getAllToolNames,
	getToolCategories,
} from "./tools/registry.js";
// Search tools
export { globTool, grepTool, searchTools } from "./tools/search.js";
// Shell tools
export {
	bashOutputTool,
	executeBashTool,
	killBashTool,
	shellTools,
} from "./tools/shell.js";
// Todo tool
export { createTodoTool, type TodoToolContext } from "./tools/todo.js";
export { scanProjectFiles } from "./utils/file-scanner.js";
export { sendNotification } from "./utils/notifications.js";

// ============================================================================
// Version
// ============================================================================
export const version = "0.1.0";
