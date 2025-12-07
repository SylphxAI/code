/**
 * Message Schemas
 * Shared Zod schemas for message-related validation
 * Single source of truth for MessagePart and related types
 */
import { z } from "zod";
/**
 * Status schema shared across all message parts
 * NOTE: Made optional with default to handle legacy data without status field
 */
export declare const PartStatusSchema: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
    error: "error";
    active: "active";
    completed: "completed";
    abort: "abort";
    pending: "pending";
}>>>;
/**
 * System Message schema
 * Runtime warnings/notifications inserted between steps
 */
export declare const SystemMessageSchema: z.ZodObject<{
    type: z.ZodString;
    content: z.ZodString;
    timestamp: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
/**
 * Token Usage schema
 */
export declare const TokenUsageSchema: z.ZodObject<{
    promptTokens: z.ZodNumber;
    completionTokens: z.ZodNumber;
    totalTokens: z.ZodNumber;
}, z.core.$strip>;
/**
 * MessagePart validation schema
 * Discriminated union for all message part types
 *
 * Design: Runtime validation with proper type discrimination
 * - Uses discriminatedUnion for better error messages
 * - Validates all required fields per type
 * - Uses z.unknown() for flexible tool input/result data
 * - Self-healing: Invalid parts can be caught and logged
 */
export declare const MessagePartSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"text">;
    content: z.ZodString;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        error: "error";
        active: "active";
        completed: "completed";
        abort: "abort";
        pending: "pending";
    }>>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"reasoning">;
    content: z.ZodString;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        error: "error";
        active: "active";
        completed: "completed";
        abort: "abort";
        pending: "pending";
    }>>>;
    duration: z.ZodOptional<z.ZodNumber>;
    startTime: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"tool">;
    toolId: z.ZodString;
    name: z.ZodString;
    mcpServerId: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        error: "error";
        active: "active";
        completed: "completed";
        abort: "abort";
        pending: "pending";
    }>>>;
    input: z.ZodOptional<z.ZodUnknown>;
    result: z.ZodOptional<z.ZodUnknown>;
    error: z.ZodOptional<z.ZodString>;
    duration: z.ZodOptional<z.ZodNumber>;
    startTime: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"file">;
    relativePath: z.ZodString;
    size: z.ZodNumber;
    mediaType: z.ZodString;
    base64: z.ZodString;
    status: z.ZodLiteral<"completed">;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"file-ref">;
    fileContentId: z.ZodString;
    relativePath: z.ZodString;
    size: z.ZodNumber;
    mediaType: z.ZodString;
    status: z.ZodLiteral<"completed">;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"system-message">;
    content: z.ZodString;
    messageType: z.ZodString;
    timestamp: z.ZodNumber;
    status: z.ZodLiteral<"completed">;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"error">;
    error: z.ZodString;
    status: z.ZodLiteral<"completed">;
}, z.core.$strip>], "type">;
/**
 * Message Step schema
 */
export declare const MessageStepSchema: z.ZodObject<{
    id: z.ZodString;
    stepIndex: z.ZodNumber;
    parts: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"text">;
        content: z.ZodString;
        status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            error: "error";
            active: "active";
            completed: "completed";
            abort: "abort";
            pending: "pending";
        }>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"reasoning">;
        content: z.ZodString;
        status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            error: "error";
            active: "active";
            completed: "completed";
            abort: "abort";
            pending: "pending";
        }>>>;
        duration: z.ZodOptional<z.ZodNumber>;
        startTime: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"tool">;
        toolId: z.ZodString;
        name: z.ZodString;
        mcpServerId: z.ZodOptional<z.ZodString>;
        status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            error: "error";
            active: "active";
            completed: "completed";
            abort: "abort";
            pending: "pending";
        }>>>;
        input: z.ZodOptional<z.ZodUnknown>;
        result: z.ZodOptional<z.ZodUnknown>;
        error: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
        startTime: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"file">;
        relativePath: z.ZodString;
        size: z.ZodNumber;
        mediaType: z.ZodString;
        base64: z.ZodString;
        status: z.ZodLiteral<"completed">;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"file-ref">;
        fileContentId: z.ZodString;
        relativePath: z.ZodString;
        size: z.ZodNumber;
        mediaType: z.ZodString;
        status: z.ZodLiteral<"completed">;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"system-message">;
        content: z.ZodString;
        messageType: z.ZodString;
        timestamp: z.ZodNumber;
        status: z.ZodLiteral<"completed">;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"error">;
        error: z.ZodString;
        status: z.ZodLiteral<"completed">;
    }, z.core.$strip>], "type">>;
    systemMessages: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        content: z.ZodString;
        timestamp: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>>;
    usage: z.ZodOptional<z.ZodObject<{
        promptTokens: z.ZodNumber;
        completionTokens: z.ZodNumber;
        totalTokens: z.ZodNumber;
    }, z.core.$strip>>;
    provider: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
    duration: z.ZodOptional<z.ZodNumber>;
    finishReason: z.ZodOptional<z.ZodEnum<{
        length: "length";
        error: "error";
        stop: "stop";
        "tool-calls": "tool-calls";
    }>>;
    status: z.ZodEnum<{
        error: "error";
        active: "active";
        completed: "completed";
        abort: "abort";
    }>;
    startTime: z.ZodOptional<z.ZodNumber>;
    endTime: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
/**
 * File Attachment Input schema
 */
export declare const FileAttachmentInputSchema: z.ZodObject<{
    fileId: z.ZodString;
    relativePath: z.ZodString;
    size: z.ZodNumber;
    mimeType: z.ZodString;
    type: z.ZodOptional<z.ZodEnum<{
        file: "file";
        image: "image";
    }>>;
}, z.core.$strip>;
/**
 * String array schema (for enabledRuleIds, etc.)
 */
export declare const StringArraySchema: z.ZodArray<z.ZodString>;
/**
 * Type exports for convenience
 */
export type MessagePart = z.infer<typeof MessagePartSchema>;
export type MessageStep = z.infer<typeof MessageStepSchema>;
export type SystemMessage = z.infer<typeof SystemMessageSchema>;
export type TokenUsage = z.infer<typeof TokenUsageSchema>;
export type FileAttachmentInput = z.infer<typeof FileAttachmentInputSchema>;
//# sourceMappingURL=message.schemas.d.ts.map