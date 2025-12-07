/**
 * Unified Result Type - 統一結果類型
 * Single source of truth for Result<T, E> across the entire project
 *
 * This replaces all conflicting Result type definitions:
 * - src/core/type-utils.ts
 * - src/core/functional/result.ts
 * - src/utils/functional.ts
 */
/**
 * Result type for functional error handling
 * Represents success or failure without exceptions
 */
export type Result<T, E = Error> = {
    success: true;
    data: T;
} | {
    success: false;
    error: E;
};
/**
 * Create a successful result
 */
export declare const ok: <T>(data: T) => Result<T>;
/**
 * Create an error result
 */
export declare const err: <E>(error: E) => Result<never, E>;
/**
 * Check if result is successful
 */
export declare const isOk: <T, E>(result: Result<T, E>) => result is {
    success: true;
    data: T;
};
/**
 * Check if result is an error
 */
export declare const isErr: <T, E>(result: Result<T, E>) => result is {
    success: false;
    error: E;
};
/**
 * Transform the success value
 * Error propagates unchanged
 */
export declare const map: <T, U, E>(fn: (data: T) => U) => (result: Result<T, E>) => Result<U, E>;
/**
 * Transform the success value with a function that returns a Result
 * Enables chaining operations that can fail
 * Error propagates unchanged
 */
export declare const flatMap: <T, U, E>(fn: (data: T) => Result<U, E>) => (result: Result<T, E>) => Result<U, E>;
/**
 * Transform the error
 * Success propagates unchanged
 */
export declare const mapError: <T, E, F>(fn: (error: E) => F) => (result: Result<T, E>) => Result<T, F>;
/**
 * Extract value or provide default
 */
export declare const getOrElse: <T>(defaultValue: T) => <E>(result: Result<T, E>) => T;
/**
 * Extract value or compute default
 */
export declare const getOrElseLazy: <T>(fn: () => T) => <E>(result: Result<T, E>) => T;
/**
 * Pattern matching
 */
export declare const match: <T, E, U>(onSuccess: (data: T) => U, onError: (error: E) => U) => (result: Result<T, E>) => U;
/**
 * Extract value or throw error
 * Use only when you're certain the result is successful
 */
export declare const unwrap: <T, E>(result: Result<T, E>) => T;
/**
 * Extract error or throw
 * Use only when you're certain the result is an error
 */
export declare const unwrapError: <T, E>(result: Result<T, E>) => E;
/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;
/**
 * Convert thrown exception to Result
 */
export declare const tryCatch: <T, E = Error>(fn: () => T, onError?: (error: unknown) => E) => Result<T, E>;
/**
 * Convert Promise to Result
 */
export declare const tryCatchAsync: <T, E = Error>(fn: () => Promise<T>, onError?: (error: unknown) => E) => Promise<Result<T, E>>;
/**
 * Safe async function wrapper
 */
export declare const safeAsync: <T, E = Error>(fn: () => Promise<T>, errorFn?: (error: unknown) => E) => Promise<Result<T, E>>;
/**
 * Safe sync function wrapper
 */
export declare const safeSync: <T, E = Error>(fn: () => T, errorFn?: (error: unknown) => E) => Result<T, E>;
/**
 * Combine multiple Results into a single Result containing an array
 * Fails if any Result is an error (short-circuits on first error)
 */
export declare const all: <T, E>(results: Result<T, E>[]) => Result<T[], E>;
/**
 * Combine multiple Results into a single Result containing an array
 * Collects all errors instead of short-circuiting
 */
export declare const allWithErrors: <T, E>(results: Result<T, E>[]) => Result<T[], E[]>;
/**
 * Combine multiple AsyncResults
 */
export declare const allAsync: <T, E>(results: AsyncResult<T, E>[]) => Promise<Result<T[], E>>;
/**
 * Race multiple AsyncResults - returns first successful result
 */
export declare const raceAsync: <T, E>(results: AsyncResult<T, E>[]) => Promise<Result<T, E>>;
/**
 * Run side effect for success case
 */
export declare const tap: <T, E>(fn: (data: T) => void) => (result: Result<T, E>) => Result<T, E>;
/**
 * Run side effect for error case
 */
export declare const tapError: <T, E>(fn: (error: E) => void) => (result: Result<T, E>) => Result<T, E>;
/**
 * Run side effect for both cases
 */
export declare const tapBoth: <T, E>(onSuccess: (data: T) => void, onError: (error: E) => void) => (result: Result<T, E>) => Result<T, E>;
/**
 * Legacy compatibility aliases
 * These help migrate from old Result implementations
 */
export declare const success: typeof ok;
export declare const failure: typeof err;
export declare const isSuccess: typeof isOk;
export declare const isFailure: typeof isErr;
export declare const unwrapResult: typeof unwrap;
export declare const mapResult: typeof map;
/**
 * Helper to infer the success type from a Result
 */
export type SuccessType<T> = T extends Result<infer U, any> ? U : never;
/**
 * Helper to infer the error type from a Result
 */
export type ErrorType<T> = T extends Result<any, infer E> ? E : never;
/**
 * Create a type-safe Result from a function that might throw
 */
export type SafeResult<T extends (...args: never[]) => unknown> = Result<ReturnType<T>, Error>;
//# sourceMappingURL=result.d.ts.map