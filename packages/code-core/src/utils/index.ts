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

// Database errors
export {
	DatabaseError,
	ValidationError,
	ConnectionError,
	MigrationError,
	isDatabaseError,
	isValidationError,
	isConnectionError,
	isMigrationError,
	createMigrationError,
	createConnectionError,
} from "./database-errors.js";

// Diff formatting utilities
export { formatDiffLine, formatDiffLines } from "./diff-formatter.js";

// Error handling
export {
	CLIError,
	handleError,
	createAsyncHandler,
} from "./error-handler.js";

// File operations
export type {
	FileReadOptions,
	FileWriteOptions,
	FileCopyOptions,
	FileInfo,
} from "./file-operations.js";
export {
	formatFileSize,
	validateFilePath,
} from "./file-operations.js";

// JSONC utilities
export { parseJSONC, stringifyJSONC } from "./jsonc.js";

// Logger utilities
export type { LogLevel, LogEntry, LoggerConfig, Logger } from "./logger.js";
export { createLogger, logger, log } from "./logger.js";

// Path utilities
export {
	findPackageRoot,
	getAgentsDir,
	getTemplatesDir,
	getRulesDir,
	getKnowledgeDir,
	getOutputStylesDir,
	getSlashCommandsDir,
	getRuleFile,
	getPathsInfo,
} from "./paths.js";

// Security utilities
export {
	securitySchemas,
	pathSecurity,
	commandSecurity,
	sanitize,
	envSecurity,
	cryptoUtils,
	RateLimiter,
	securityMiddleware,
} from "./security.js";

// Simplified errors
export {
	ErrorSeverity,
	ErrorCategory,
	AppError,
	ValidationError as SimplifiedValidationError,
	ConfigurationError,
	DatabaseError as SimplifiedDatabaseError,
	NetworkError,
	FilesystemError,
	AuthenticationError,
	ErrorFactory,
	ErrorHandler,
	createValidationError,
	createConfigurationError,
	createDatabaseError,
	createNetworkError,
	createFilesystemError,
	createAuthenticationError,
	createError,
} from "./simplified-errors.js";
export type { ErrorInfo } from "./simplified-errors.js";

// Console UI utilities
export { ui } from "./console-ui.js";

// Secret utilities
export { secretUtils } from "./secret-utils.js";

// Template engine
export type { TemplateData } from "./template-engine.js";
export { TemplateEngine } from "./template-engine.js";

// Help utilities
export { showDefaultHelp } from "./help.js";

// Settings utilities
export type { ProjectSettings as ProjectSettingsType } from "./settings.js";
export {
	getSettingsPath,
	settingsExists,
	loadSettings,
	saveSettings,
	updateSettings,
	getDefaultTarget,
	setDefaultTarget,
	ProjectSettings,
	projectSettings,
} from "./settings.js";
