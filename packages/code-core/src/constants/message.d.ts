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
export declare const MESSAGE_STATUS: {
    /** Message is actively being generated */
    readonly ACTIVE: "active";
    /** Message generation completed successfully */
    readonly COMPLETED: "completed";
    /** Message generation failed with error */
    readonly ERROR: "error";
    /** Message generation was aborted by user */
    readonly ABORT: "abort";
};
export type MessageStatus = (typeof MESSAGE_STATUS)[keyof typeof MESSAGE_STATUS];
/**
 * Content part status constants
 * Represents the state of individual content parts (text, reasoning, tool)
 */
export declare const PART_STATUS: {
    /** Part is actively being generated */
    readonly ACTIVE: "active";
    /** Part generation completed successfully */
    readonly COMPLETED: "completed";
    /** Part generation failed with error */
    readonly ERROR: "error";
    /** Part generation was aborted by user */
    readonly ABORT: "abort";
};
export type PartStatus = (typeof PART_STATUS)[keyof typeof PART_STATUS];
/**
 * Step status constants
 * Represents the state of a message step (reasoning cycle)
 */
export declare const STEP_STATUS: {
    /** Step is actively being processed */
    readonly ACTIVE: "active";
    /** Step processing completed successfully */
    readonly COMPLETED: "completed";
    /** Step processing failed with error */
    readonly ERROR: "error";
    /** Step processing was aborted by user */
    readonly ABORT: "abort";
};
export type StepStatus = (typeof STEP_STATUS)[keyof typeof STEP_STATUS];
/**
 * Finish reason constants
 * Represents why a generation completed
 */
export declare const FINISH_REASON: {
    /** Natural completion */
    readonly STOP: "stop";
    /** Token limit reached */
    readonly LENGTH: "length";
    /** Tool calls requested */
    readonly TOOL_CALLS: "tool-calls";
    /** Content filtered */
    readonly CONTENT_FILTER: "content-filter";
    /** Unknown/other reason */
    readonly UNKNOWN: "unknown";
    /** Error occurred */
    readonly ERROR: "error";
};
export type FinishReason = (typeof FINISH_REASON)[keyof typeof FINISH_REASON];
/**
 * Helper: Check if status indicates active generation
 */
export declare function isActiveStatus(status: MessageStatus | PartStatus | StepStatus): boolean;
/**
 * Helper: Check if status indicates completion
 */
export declare function isCompletedStatus(status: MessageStatus | PartStatus | StepStatus): boolean;
/**
 * Helper: Check if status indicates error
 */
export declare function isErrorStatus(status: MessageStatus | PartStatus | StepStatus): boolean;
/**
 * Helper: Check if status indicates abortion
 */
export declare function isAbortStatus(status: MessageStatus | PartStatus | StepStatus): boolean;
/**
 * Helper: Check if status indicates terminal state (not active)
 */
export declare function isTerminalStatus(status: MessageStatus | PartStatus | StepStatus): boolean;
//# sourceMappingURL=message.d.ts.map