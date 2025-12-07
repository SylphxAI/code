/**
 * Error Handling - 統一錯誤處理
 * Functional, composable error handling system
 */
import type { Result } from "./result.js";
/**
 * Base error class
 */
export declare class BaseError extends Error {
    readonly code: string;
    readonly statusCode: number;
    readonly details?: Record<string, unknown>;
    constructor(message: string, code: string, statusCode?: number, details?: Record<string, unknown>);
}
/**
 * Validation error
 */
export declare class ValidationError extends BaseError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Configuration error
 */
export declare class ConfigurationError extends BaseError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Storage error
 */
export declare class StorageError extends BaseError {
    constructor(message: string, operation?: string, details?: Record<string, unknown>);
}
/**
 * Network error
 */
export declare class NetworkError extends BaseError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Authentication error
 */
export declare class AuthenticationError extends BaseError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Authorization error
 */
export declare class AuthorizationError extends BaseError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Not found error
 */
export declare class NotFoundError extends BaseError {
    constructor(message: string, resource?: string, details?: Record<string, unknown>);
}
/**
 * Timeout error
 */
export declare class TimeoutError extends BaseError {
    constructor(message: string, timeout?: number, details?: Record<string, unknown>);
}
/**
 * Error types
 */
export declare const ErrorTypes: {
    readonly ValidationError: typeof ValidationError;
    readonly ConfigurationError: typeof ConfigurationError;
    readonly StorageError: typeof StorageError;
    readonly NetworkError: typeof NetworkError;
    readonly AuthenticationError: typeof AuthenticationError;
    readonly AuthorizationError: typeof AuthorizationError;
    readonly NotFoundError: typeof NotFoundError;
    readonly TimeoutError: typeof TimeoutError;
};
/**
 * Error codes
 */
export declare const ErrorCodes: {
    readonly INVALID_INPUT: "INVALID_INPUT";
    readonly MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD";
    readonly INVALID_FORMAT: "INVALID_FORMAT";
    readonly MISSING_CONFIG: "MISSING_CONFIG";
    readonly INVALID_CONFIG: "INVALID_CONFIG";
    readonly CONFIG_PARSE_ERROR: "CONFIG_PARSE_ERROR";
    readonly STORAGE_CONNECTION_FAILED: "STORAGE_CONNECTION_FAILED";
    readonly STORAGE_OPERATION_FAILED: "STORAGE_OPERATION_FAILED";
    readonly STORAGE_TIMEOUT: "STORAGE_TIMEOUT";
    readonly STORAGE_FULL: "STORAGE_FULL";
    readonly CONNECTION_FAILED: "CONNECTION_FAILED";
    readonly REQUEST_FAILED: "REQUEST_FAILED";
    readonly REQUEST_TIMEOUT: "REQUEST_TIMEOUT";
    readonly RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly INVALID_CREDENTIALS: "INVALID_CREDENTIALS";
    readonly TOKEN_EXPIRED: "TOKEN_EXPIRED";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS";
    readonly RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND";
    readonly ENDPOINT_NOT_FOUND: "ENDPOINT_NOT_FOUND";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
    readonly TIMEOUT: "TIMEOUT";
};
/**
 * Error handler interface
 */
export interface ErrorHandler {
    canHandle(error: Error): boolean;
    handle(error: Error): void | Promise<void>;
}
/**
 * Logger error handler
 */
export declare class LoggerErrorHandler implements ErrorHandler {
    private level;
    constructor(level?: "error" | "warn" | "info" | "debug");
    canHandle(_error: Error): boolean;
    handle(error: Error): void;
}
/**
 * Console error handler
 */
export declare class ConsoleErrorHandler implements ErrorHandler {
    canHandle(_error: Error): boolean;
    handle(error: Error): void;
}
/**
 * Error handler chain
 */
export declare class ErrorHandlerChain {
    private handlers;
    constructor(handlers?: ErrorHandler[]);
    addHandler(handler: ErrorHandler): void;
    removeHandler(handler: ErrorHandler): void;
    handle(error: Error): Promise<void>;
}
/**
 * Global error handler
 */
export declare const globalErrorHandler: ErrorHandlerChain;
/**
 * Set up global error handlers
 */
export declare function setupGlobalErrorHandlers(): void;
/**
 * Safe function wrapper with error handling
 */
export declare function withErrorHandling<T>(fn: () => Promise<T>, errorHandler?: (error: Error) => void | Promise<void>): Promise<Result<T>>;
/**
 * Safe sync function wrapper with error handling
 */
export declare function withSyncErrorHandling<T>(fn: () => T, errorHandler?: (error: Error) => void | Promise<void>): Result<T>;
/**
 * Retry function with error handling
 */
export declare function withRetry<T>(fn: () => Promise<T>, options?: {
    maxAttempts?: number;
    delay?: number;
    backoff?: "linear" | "exponential";
    retryableErrors?: string[];
    onRetry?: (attempt: number, error: Error) => void;
}): Promise<Result<T>>;
/**
 * Timeout wrapper
 */
export declare function withTimeout<T>(fn: () => Promise<T>, timeoutMs: number, timeoutMessage?: string): Promise<Result<T>>;
/**
 * Circuit breaker pattern
 */
export declare class CircuitBreaker {
    private options;
    private failures;
    private lastFailureTime;
    private state;
    constructor(options?: {
        failureThreshold?: number;
        recoveryTimeMs?: number;
        monitoringPeriodMs?: number;
    });
    execute<T>(fn: () => Promise<T>): Promise<Result<T>>;
    private onSuccess;
    private onFailure;
    getState(): "closed" | "open" | "half-open";
    getFailures(): number;
    reset(): void;
}
//# sourceMappingURL=error-handling.d.ts.map