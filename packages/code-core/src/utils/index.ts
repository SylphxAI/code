/**
 * Centralized utility exports
 * Provides both legacy organization and new feature-based organization
 */

// ============================================================================
// FEATURE-BASED ORGANIZATION (Removed - migrated to domains/ and services/)
// ============================================================================
// Features now organized in:
// - src/domains/ for domain-specific logic
// - src/services/ for shared infrastructure

// ============================================================================
// LEGACY ORGANIZATION (Backward Compatibility)
// ============================================================================
// Direct exports for backward compatibility - @deprecated

// Console UI utilities
export { ui } from "./console-ui.js";
// Database errors
export {
	ConnectionError,
	createConnectionError,
	createMigrationError,
	DatabaseError,
	isConnectionError,
	isDatabaseError,
	isMigrationError,
	isValidationError,
	MigrationError,
	ValidationError,
} from "./database-errors.js";
// Diff formatting utilities
export { formatDiffLine, formatDiffLines } from "./diff-formatter.js";
// Error handling
export {
	CLIError,
	createAsyncHandler,
	handleError,
} from "./error-handler.js";
// File operations
export type {
	FileCopyOptions,
	FileInfo,
	FileReadOptions,
	FileWriteOptions,
} from "./file-operations.js";
export {
	formatFileSize,
	validateFilePath,
} from "./file-operations.js";
// Help utilities
export { showDefaultHelp } from "./help.js";
// JSONC utilities
export { parseJSONC, stringifyJSONC } from "./jsonc.js";
// Logger utilities
export type { LogEntry, Logger, LoggerConfig, LogLevel } from "./logger.js";
export { createLogger, log, logger } from "./logger.js";
// Path utilities
export {
	findPackageRoot,
	getAgentsDir,
	getKnowledgeDir,
	getOutputStylesDir,
	getPathsInfo,
	getRuleFile,
	getRulesDir,
	getSlashCommandsDir,
	getTemplatesDir,
} from "./paths.js";
// Secret utilities
export { secretUtils } from "./secret-utils.js";
// Security utilities
export {
	commandSecurity,
	cryptoUtils,
	envSecurity,
	pathSecurity,
	RateLimiter,
	sanitize,
	securityMiddleware,
	securitySchemas,
} from "./security.js";
// Settings utilities
export type { ProjectSettings as ProjectSettingsType } from "./settings.js";
export {
	getDefaultTarget,
	getSettingsPath,
	loadSettings,
	ProjectSettings,
	projectSettings,
	saveSettings,
	setDefaultTarget,
	settingsExists,
	updateSettings,
} from "./settings.js";
export type { ErrorInfo } from "./simplified-errors.js";
// Simplified errors
export {
	AppError,
	AuthenticationError,
	ConfigurationError,
	createAuthenticationError,
	createConfigurationError,
	createDatabaseError,
	createError,
	createFilesystemError,
	createNetworkError,
	createValidationError,
	DatabaseError as SimplifiedDatabaseError,
	ErrorCategory,
	ErrorFactory,
	ErrorHandler,
	ErrorSeverity,
	FilesystemError,
	NetworkError,
	ValidationError as SimplifiedValidationError,
} from "./simplified-errors.js";
// Template engine
export type { TemplateData } from "./template-engine.js";
export { TemplateEngine } from "./template-engine.js";
