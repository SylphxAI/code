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
export declare const NETWORK: {
    /** Default server host */
    readonly DEFAULT_HOST: string;
    /** Default server port */
    readonly DEFAULT_PORT: number;
    /** Default web UI port */
    readonly DEFAULT_WEB_PORT: number;
    /** Request timeout in milliseconds */
    readonly REQUEST_TIMEOUT_MS: number;
    /** API request timeout in milliseconds */
    readonly API_TIMEOUT_MS: number;
};
/**
 * Retry configuration defaults
 */
export declare const RETRY: {
    /** Default maximum retry attempts */
    readonly DEFAULT_MAX_RETRIES: 3;
    /** Database operation max retries */
    readonly DATABASE_MAX_RETRIES: 5;
    /** Network operation max retries */
    readonly NETWORK_MAX_RETRIES: 2;
    /** Initial retry delay in milliseconds */
    readonly INITIAL_DELAY_MS: 100;
    /** Database retry initial delay in milliseconds */
    readonly DATABASE_INITIAL_DELAY_MS: 50;
    /** Exponential backoff multiplier */
    readonly BACKOFF_MULTIPLIER: 2;
    /** Maximum retry delay cap in milliseconds */
    readonly MAX_DELAY_MS: 10000;
};
/**
 * Database configuration
 */
export declare const DATABASE: {
    /** Default database path (relative to CWD) */
    readonly DEFAULT_PATH: ".sylphx-code/sessions.db";
    /** Query timeout in milliseconds */
    readonly QUERY_TIMEOUT_MS: 5000;
    /** Connection pool size */
    readonly POOL_SIZE: 10;
    /** Busy timeout for SQLITE */
    readonly BUSY_TIMEOUT_MS: 5000;
};
/**
 * File system configuration
 */
export declare const FILESYSTEM: {
    /** Default config directory */
    readonly CONFIG_DIR: ".sylphx-code";
    /** Settings file name */
    readonly SETTINGS_FILE: "settings.json";
    /** Secrets file name */
    readonly SECRETS_FILE: ".secrets.json";
    /** Max file size for reading (in bytes) */
    readonly MAX_FILE_SIZE_BYTES: number;
};
/**
 * Session configuration
 */
export declare const SESSION: {
    /** Default session title */
    readonly DEFAULT_TITLE: "New Chat";
    /** Max messages to load initially */
    readonly INITIAL_MESSAGE_LIMIT: 50;
    /** Pagination page size */
    readonly PAGE_SIZE: 20;
    /** Max content preview length */
    readonly PREVIEW_LENGTH: 100;
};
/**
 * UI configuration
 */
export declare const UI: {
    /** Debounce delay for search input (ms) */
    readonly SEARCH_DEBOUNCE_MS: 300;
    /** Toast notification duration (ms) */
    readonly TOAST_DURATION_MS: 3000;
    /** Animation duration (ms) */
    readonly ANIMATION_DURATION_MS: 200;
    /** Max lines to display in code blocks */
    readonly MAX_CODE_LINES: 1000;
};
/**
 * AI/LLM configuration
 */
export declare const AI: {
    /** Default agent ID */
    readonly DEFAULT_AGENT_ID: "coder";
    /** Max completion tokens */
    readonly DEFAULT_MAX_TOKENS: 4096;
    /** Default temperature */
    readonly DEFAULT_TEMPERATURE: 1;
    /** Max steps in agentic loop */
    readonly MAX_STEPS: 1000;
    /** Stream chunk buffer size */
    readonly STREAM_BUFFER_SIZE: 1024;
};
/**
 * Validation limits
 */
export declare const LIMITS: {
    /** Max message length */
    readonly MAX_MESSAGE_LENGTH: 100000;
    /** Max file attachment size (bytes) */
    readonly MAX_ATTACHMENT_SIZE: number;
    /** Max number of attachments */
    readonly MAX_ATTACHMENTS: 10;
    /** Max todo items */
    readonly MAX_TODOS: 100;
    /** Max session title length */
    readonly MAX_TITLE_LENGTH: 100;
};
/**
 * Helper: Get server URL
 */
export declare function getServerURL(host?: string, port?: number): string;
/**
 * Helper: Get web UI URL
 */
export declare function getWebURL(host?: string, port?: number): string;
/**
 * Helper: Get database path
 */
export declare function getDatabasePath(cwd?: string): string;
/**
 * Helper: Get config directory path
 */
export declare function getConfigDir(homeDir?: string): string;
//# sourceMappingURL=config.d.ts.map