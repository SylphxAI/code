/**
 * Retry Utility
 * Unified retry logic with exponential backoff
 *
 * Replaces duplicate retry implementations across the codebase:
 * - session-repository.ts (retryOnBusy)
 * - openrouter-provider.ts (network retry)
 * - Other database/network operations
 */
export interface RetryOptions {
    /** Maximum number of retry attempts (default: from RETRY.DEFAULT_MAX_RETRIES) */
    maxRetries?: number;
    /** Initial delay in milliseconds (default: from RETRY.INITIAL_DELAY_MS) */
    initialDelayMs?: number;
    /** Multiplier for exponential backoff (default: from RETRY.BACKOFF_MULTIPLIER) */
    backoffMultiplier?: number;
    /** Maximum delay cap in milliseconds (default: from RETRY.MAX_DELAY_MS) */
    maxDelayMs?: number;
    /** Predicate to determine if error should be retried */
    shouldRetry?: (error: unknown, attempt: number) => boolean;
    /** Callback invoked on each retry attempt */
    onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}
/**
 * Execute an operation with retry logic and exponential backoff
 *
 * @example
 * ```typescript
 * // Database operation with SQLITE_BUSY retry
 * const session = await retry(
 *   () => db.select().from(sessions).where(eq(sessions.id, id)),
 *   { shouldRetry: isSQLiteBusyError }
 * );
 *
 * // Network operation with default retry
 * const data = await retry(
 *   () => fetch('https://api.example.com/data'),
 *   { maxRetries: 2, initialDelayMs: 50 }
 * );
 * ```
 */
export declare function retry<T>(operation: () => Promise<T>, options?: RetryOptions): Promise<T>;
/**
 * Predicate: Check if error is SQLITE_BUSY
 * Checks error message, code, and nested cause for SQLITE_BUSY errors
 */
export declare function isSQLiteBusyError(error: unknown): boolean;
/**
 * Predicate: Check if error is a network error
 */
export declare function isNetworkError(error: unknown): boolean;
/**
 * Predicate: Retry all errors (default behavior)
 */
export declare function retryAllErrors(): boolean;
/**
 * Convenience function: Retry database operations with SQLITE_BUSY handling
 */
export declare function retryDatabase<T>(operation: () => Promise<T>, maxRetries?: 5): Promise<T>;
/**
 * Convenience function: Retry network operations
 */
export declare function retryNetwork<T>(operation: () => Promise<T>, maxRetries?: 2): Promise<T>;
//# sourceMappingURL=retry.d.ts.map