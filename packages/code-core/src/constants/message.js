/**
 * Message Constants
 * Centralized constants for message and content lifecycle states
 *
 * Benefits:
 * - Single source of truth for status values
 * - Type-safe constants prevent typos
 * - Easy to update across entire codebase
 * - Runtime validation support
 */
/**
 * Message status constants
 * Represents the overall state of a message
 */
export const MESSAGE_STATUS = {
    /** Message is actively being generated */
    ACTIVE: "active",
    /** Message generation completed successfully */
    COMPLETED: "completed",
    /** Message generation failed with error */
    ERROR: "error",
    /** Message generation was aborted by user */
    ABORT: "abort",
};
/**
 * Content part status constants
 * Represents the state of individual content parts (text, reasoning, tool)
 */
export const PART_STATUS = {
    /** Part is actively being generated */
    ACTIVE: "active",
    /** Part generation completed successfully */
    COMPLETED: "completed",
    /** Part generation failed with error */
    ERROR: "error",
    /** Part generation was aborted by user */
    ABORT: "abort",
};
/**
 * Step status constants
 * Represents the state of a message step (reasoning cycle)
 */
export const STEP_STATUS = {
    /** Step is actively being processed */
    ACTIVE: "active",
    /** Step processing completed successfully */
    COMPLETED: "completed",
    /** Step processing failed with error */
    ERROR: "error",
    /** Step processing was aborted by user */
    ABORT: "abort",
};
/**
 * Finish reason constants
 * Represents why a generation completed
 */
export const FINISH_REASON = {
    /** Natural completion */
    STOP: "stop",
    /** Token limit reached */
    LENGTH: "length",
    /** Tool calls requested */
    TOOL_CALLS: "tool-calls",
    /** Content filtered */
    CONTENT_FILTER: "content-filter",
    /** Unknown/other reason */
    UNKNOWN: "unknown",
    /** Error occurred */
    ERROR: "error",
};
/**
 * Helper: Check if status indicates active generation
 */
export function isActiveStatus(status) {
    return status === MESSAGE_STATUS.ACTIVE;
}
/**
 * Helper: Check if status indicates completion
 */
export function isCompletedStatus(status) {
    return status === MESSAGE_STATUS.COMPLETED;
}
/**
 * Helper: Check if status indicates error
 */
export function isErrorStatus(status) {
    return status === MESSAGE_STATUS.ERROR;
}
/**
 * Helper: Check if status indicates abortion
 */
export function isAbortStatus(status) {
    return status === MESSAGE_STATUS.ABORT;
}
/**
 * Helper: Check if status indicates terminal state (not active)
 */
export function isTerminalStatus(status) {
    return !isActiveStatus(status);
}
//# sourceMappingURL=message.js.map