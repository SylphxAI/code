/**
 * Centralized logging utility for Sylphx Flow
 * Provides structured logging with different levels and output formats
 */
export type LogLevel = "debug" | "info" | "warn" | "error";
export interface LogEntry {
    id: string;
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: Record<string, unknown>;
    error?: {
        name: string;
        message: string;
        stack?: string;
        code?: string;
    };
    module?: string;
    function?: string;
}
export interface LoggerConfig {
    level: LogLevel;
    format: "json" | "pretty" | "simple";
    includeTimestamp: boolean;
    includeContext: boolean;
    colors: boolean;
    module?: string;
}
/**
 * Logger interface for dependency injection and testing
 */
export interface Logger {
    child(context: Record<string, unknown>): Logger;
    module(moduleName: string): Logger;
    setLevel(level: LogLevel): void;
    updateConfig(config: Partial<LoggerConfig>): void;
    debug(message: string, context?: Record<string, unknown>): void;
    info(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    error(message: string, error?: Error, context?: Record<string, unknown>): void;
    time<T>(fn: () => Promise<T>, label: string, context?: Record<string, unknown>): Promise<T>;
    timeSync<T>(fn: () => T, label: string, context?: Record<string, unknown>): T;
}
/**
 * Options for creating a logger instance
 */
interface CreateLoggerOptions {
    config?: Partial<LoggerConfig>;
    context?: Record<string, unknown>;
}
/**
 * Create a logger instance with the specified configuration and context
 */
export declare function createLogger(options?: string | Partial<LoggerConfig> | CreateLoggerOptions): Logger;
export declare const logger: Logger;
export declare const log: {
    debug: (message: string, context?: Record<string, unknown>) => void;
    info: (message: string, context?: Record<string, unknown>) => void;
    warn: (message: string, context?: Record<string, unknown>) => void;
    error: (message: string, error?: Error, context?: Record<string, unknown>) => void;
    time: <T>(fn: () => Promise<T>, label: string, context?: Record<string, unknown>) => Promise<T>;
    timeSync: <T>(fn: () => T, label: string, context?: Record<string, unknown>) => T;
    child: (context: Record<string, unknown>) => Logger;
    module: (moduleName: string) => Logger;
    setLevel: (level: LogLevel) => void;
    updateConfig: (config: Partial<LoggerConfig>) => void;
};
export default logger;
//# sourceMappingURL=logger.d.ts.map