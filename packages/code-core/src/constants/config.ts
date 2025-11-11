/**
 * Configuration Constants
 * Centralized constants for network, timing, and system configuration
 *
 * Benefits:
 * - Single source of truth for configuration values
 * - Environment-based overrides via process.env
 * - Easy to adjust for testing or deployment
 * - Self-documenting defaults
 */

/**
 * Network configuration
 */
export const NETWORK = {
	/** Default server host */
	DEFAULT_HOST: process.env.SERVER_HOST || "localhost",

	/** Default server port */
	DEFAULT_PORT: parseInt(process.env.SERVER_PORT || "3000", 10),

	/** Default web UI port */
	DEFAULT_WEB_PORT: parseInt(process.env.WEB_PORT || "8080", 10),

	/** Request timeout in milliseconds */
	REQUEST_TIMEOUT_MS: parseInt(process.env.REQUEST_TIMEOUT_MS || "30000", 10),

	/** API request timeout in milliseconds */
	API_TIMEOUT_MS: parseInt(process.env.API_TIMEOUT_MS || "10000", 10),
} as const;

/**
 * Retry configuration defaults
 */
export const RETRY = {
	/** Default maximum retry attempts */
	DEFAULT_MAX_RETRIES: 3,

	/** Database operation max retries */
	DATABASE_MAX_RETRIES: 5,

	/** Network operation max retries */
	NETWORK_MAX_RETRIES: 2,

	/** Initial retry delay in milliseconds */
	INITIAL_DELAY_MS: 100,

	/** Database retry initial delay in milliseconds */
	DATABASE_INITIAL_DELAY_MS: 50,

	/** Exponential backoff multiplier */
	BACKOFF_MULTIPLIER: 2,

	/** Maximum retry delay cap in milliseconds */
	MAX_DELAY_MS: 10000,
} as const;

/**
 * Database configuration
 */
export const DATABASE = {
	/** Default database path (relative to CWD) */
	DEFAULT_PATH: ".sylphx-code/sessions.db",

	/** Query timeout in milliseconds */
	QUERY_TIMEOUT_MS: 5000,

	/** Connection pool size */
	POOL_SIZE: 10,

	/** Busy timeout for SQLITE */
	BUSY_TIMEOUT_MS: 5000,
} as const;

/**
 * File system configuration
 */
export const FILESYSTEM = {
	/** Default config directory */
	CONFIG_DIR: ".sylphx-code",

	/** Settings file name */
	SETTINGS_FILE: "settings.json",

	/** Secrets file name */
	SECRETS_FILE: ".secrets.json",

	/** Max file size for reading (in bytes) */
	MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
} as const;

/**
 * Session configuration
 */
export const SESSION = {
	/** Default session title */
	DEFAULT_TITLE: "New Chat",

	/** Max messages to load initially */
	INITIAL_MESSAGE_LIMIT: 50,

	/** Pagination page size */
	PAGE_SIZE: 20,

	/** Max content preview length */
	PREVIEW_LENGTH: 100,
} as const;

/**
 * UI configuration
 */
export const UI = {
	/** Debounce delay for search input (ms) */
	SEARCH_DEBOUNCE_MS: 300,

	/** Toast notification duration (ms) */
	TOAST_DURATION_MS: 3000,

	/** Animation duration (ms) */
	ANIMATION_DURATION_MS: 200,

	/** Max lines to display in code blocks */
	MAX_CODE_LINES: 1000,
} as const;

/**
 * AI/LLM configuration
 */
export const AI = {
	/** Default agent ID */
	DEFAULT_AGENT_ID: "coder",

	/** Max completion tokens */
	DEFAULT_MAX_TOKENS: 4096,

	/** Default temperature */
	DEFAULT_TEMPERATURE: 1.0,

	/** Max steps in agentic loop */
	MAX_STEPS: 1000,

	/** Stream chunk buffer size */
	STREAM_BUFFER_SIZE: 1024,
} as const;

/**
 * Validation limits
 */
export const LIMITS = {
	/** Max message length */
	MAX_MESSAGE_LENGTH: 100000,

	/** Max file attachment size (bytes) */
	MAX_ATTACHMENT_SIZE: 50 * 1024 * 1024, // 50MB

	/** Max number of attachments */
	MAX_ATTACHMENTS: 10,

	/** Max todo items */
	MAX_TODOS: 100,

	/** Max session title length */
	MAX_TITLE_LENGTH: 100,
} as const;

/**
 * Helper: Get server URL
 */
export function getServerURL(host = NETWORK.DEFAULT_HOST, port = NETWORK.DEFAULT_PORT): string {
	return `http://${host}:${port}`;
}

/**
 * Helper: Get web UI URL
 */
export function getWebURL(host = NETWORK.DEFAULT_HOST, port = NETWORK.DEFAULT_WEB_PORT): string {
	return `http://${host}:${port}`;
}

/**
 * Helper: Get database path
 */
export function getDatabasePath(cwd = process.cwd()): string {
	return `${cwd}/${DATABASE.DEFAULT_PATH}`;
}

/**
 * Helper: Get config directory path
 */
export function getConfigDir(homeDir = process.env.HOME || process.cwd()): string {
	return `${homeDir}/${FILESYSTEM.CONFIG_DIR}`;
}
