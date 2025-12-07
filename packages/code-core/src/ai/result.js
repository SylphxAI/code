/**
 * Unified Result Type - 統一結果類型
 * Single source of truth for Result<T, E> across the entire project
 *
 * This replaces all conflicting Result type definitions:
 * - src/core/type-utils.ts
 * - src/core/functional/result.ts
 * - src/utils/functional.ts
 */
// ============================================================================
// CONSTRUCTORS
// ============================================================================
/**
 * Create a successful result
 */
export const ok = (data) => ({ success: true, data });
/**
 * Create an error result
 */
export const err = (error) => ({
    success: false,
    error,
});
// ============================================================================
// TYPE GUARDS
// ============================================================================
/**
 * Check if result is successful
 */
export const isOk = (result) => result.success;
/**
 * Check if result is an error
 */
export const isErr = (result) => !result.success;
// ============================================================================
// TRANSFORMATIONS
// ============================================================================
/**
 * Transform the success value
 * Error propagates unchanged
 */
export const map = (fn) => (result) => {
    if (isOk(result)) {
        return ok(fn(result.data));
    }
    return result;
};
/**
 * Transform the success value with a function that returns a Result
 * Enables chaining operations that can fail
 * Error propagates unchanged
 */
export const flatMap = (fn) => (result) => {
    if (isOk(result)) {
        return fn(result.data);
    }
    return result;
};
/**
 * Transform the error
 * Success propagates unchanged
 */
export const mapError = (fn) => (result) => {
    if (isErr(result)) {
        return err(fn(result.error));
    }
    return result;
};
/**
 * Extract value or provide default
 */
export const getOrElse = (defaultValue) => (result) => {
    if (isOk(result)) {
        return result.data;
    }
    return defaultValue;
};
/**
 * Extract value or compute default
 */
export const getOrElseLazy = (fn) => (result) => {
    if (isOk(result)) {
        return result.data;
    }
    return fn();
};
/**
 * Pattern matching
 */
export const match = (onSuccess, onError) => (result) => {
    if (isOk(result)) {
        return onSuccess(result.data);
    }
    return onError(result.error);
};
/**
 * Extract value or throw error
 * Use only when you're certain the result is successful
 */
export const unwrap = (result) => {
    if (isOk(result)) {
        return result.data;
    }
    throw result.error;
};
/**
 * Extract error or throw
 * Use only when you're certain the result is an error
 */
export const unwrapError = (result) => {
    if (isErr(result)) {
        return result.error;
    }
    throw new Error("Expected error but got success");
};
/**
 * Convert thrown exception to Result
 */
export const tryCatch = (fn, onError = (error) => error) => {
    try {
        return ok(fn());
    }
    catch (error) {
        return err(onError(error));
    }
};
/**
 * Convert Promise to Result
 */
export const tryCatchAsync = async (fn, onError = (error) => error) => {
    try {
        const data = await fn();
        return ok(data);
    }
    catch (error) {
        return err(onError(error));
    }
};
/**
 * Safe async function wrapper
 */
export const safeAsync = async (fn, errorFn) => {
    return tryCatchAsync(fn, errorFn);
};
/**
 * Safe sync function wrapper
 */
export const safeSync = (fn, errorFn) => {
    return tryCatch(fn, errorFn);
};
// ============================================================================
// COMBINATORS
// ============================================================================
/**
 * Combine multiple Results into a single Result containing an array
 * Fails if any Result is an error (short-circuits on first error)
 */
export const all = (results) => {
    const values = [];
    for (const result of results) {
        if (isErr(result)) {
            return result;
        }
        values.push(result.data);
    }
    return ok(values);
};
/**
 * Combine multiple Results into a single Result containing an array
 * Collects all errors instead of short-circuiting
 */
export const allWithErrors = (results) => {
    const values = [];
    const errors = [];
    for (const result of results) {
        if (isOk(result)) {
            values.push(result.data);
        }
        else {
            errors.push(result.error);
        }
    }
    return errors.length > 0 ? err(errors) : ok(values);
};
/**
 * Combine multiple AsyncResults
 */
export const allAsync = async (results) => {
    const settled = await Promise.all(results);
    return all(settled);
};
/**
 * Race multiple AsyncResults - returns first successful result
 */
export const raceAsync = async (results) => {
    try {
        return await Promise.race(results);
    }
    catch (error) {
        return err(error);
    }
};
// ============================================================================
// SIDE EFFECTS
// ============================================================================
/**
 * Run side effect for success case
 */
export const tap = (fn) => (result) => {
    if (isOk(result)) {
        fn(result.data);
    }
    return result;
};
/**
 * Run side effect for error case
 */
export const tapError = (fn) => (result) => {
    if (isErr(result)) {
        fn(result.error);
    }
    return result;
};
/**
 * Run side effect for both cases
 */
export const tapBoth = (onSuccess, onError) => (result) => {
    if (isOk(result)) {
        onSuccess(result.data);
    }
    else {
        onError(result.error);
    }
    return result;
};
// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================
/**
 * Legacy compatibility aliases
 * These help migrate from old Result implementations
 */
// For src/core/functional/result.ts users
export const success = ok;
export const failure = err;
export const isSuccess = isOk;
export const isFailure = isErr;
// For src/utils/functional.ts users
export const unwrapResult = unwrap;
export const mapResult = map;
//# sourceMappingURL=result.js.map