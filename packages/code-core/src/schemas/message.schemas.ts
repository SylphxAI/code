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
export const PartStatusSchema = z
	.enum(["pending", "active", "completed", "error", "abort"])
	.optional()
	.default("completed");

/**
 * System Message schema
 * Runtime warnings/notifications inserted between steps
 */
export const SystemMessageSchema = z.object({
	type: z.string(),
	content: z.string(),
	timestamp: z.number().optional(),
});

/**
 * Token Usage schema
 */
export const TokenUsageSchema = z.object({
	promptTokens: z.number(),
	completionTokens: z.number(),
	totalTokens: z.number(),
});

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
export const MessagePartSchema = z.discriminatedUnion("type", [
	// Text content
	z.object({
		type: z.literal("text"),
		content: z.string(),
		status: PartStatusSchema,
	}),

	// Extended thinking/reasoning content
	z.object({
		type: z.literal("reasoning"),
		content: z.string(),
		status: PartStatusSchema,
		duration: z.number().optional(),
		startTime: z.number().optional(),
	}),

	// Tool call/result
	z.object({
		type: z.literal("tool"),
		toolId: z.string(),
		name: z.string(),
		mcpServerId: z.string().optional(),
		status: PartStatusSchema,
		input: z.unknown().optional(),
		result: z.unknown().optional(),
		error: z.string().optional(),
		duration: z.number().optional(),
		startTime: z.number().optional(),
	}),

	// Legacy file (base64 inline)
	z.object({
		type: z.literal("file"),
		relativePath: z.string(),
		size: z.number(),
		mediaType: z.string(),
		base64: z.string(),
		status: z.literal("completed"),
	}),

	// File reference (normalized to file_contents table)
	z.object({
		type: z.literal("file-ref"),
		fileContentId: z.string(),
		relativePath: z.string(),
		size: z.number(),
		mediaType: z.string(),
		status: z.literal("completed"),
	}),

	// System message (runtime notifications)
	z.object({
		type: z.literal("system-message"),
		content: z.string(),
		messageType: z.string(),
		timestamp: z.number(),
		status: z.literal("completed"),
	}),

	// Error
	z.object({
		type: z.literal("error"),
		error: z.string(),
		status: z.literal("completed"),
	}),
]);

/**
 * Message Step schema
 */
export const MessageStepSchema = z.object({
	id: z.string(),
	stepIndex: z.number(),
	parts: z.array(MessagePartSchema),
	systemMessages: z.array(SystemMessageSchema).optional(),
	usage: TokenUsageSchema.optional(),
	provider: z.string().optional(),
	model: z.string().optional(),
	duration: z.number().optional(),
	finishReason: z.enum(["stop", "tool-calls", "length", "error"]).optional(),
	status: z.enum(["active", "completed", "error", "abort"]),
	startTime: z.number().optional(),
	endTime: z.number().optional(),
});

/**
 * File Attachment Input schema
 */
export const FileAttachmentInputSchema = z.object({
	fileId: z.string(),
	relativePath: z.string(),
	size: z.number(),
	mimeType: z.string(),
	type: z.enum(["file", "image"]).optional(),
});

/**
 * String array schema (for enabledRuleIds, etc.)
 */
export const StringArraySchema = z.array(z.string());

/**
 * Type exports for convenience
 */
export type MessagePart = z.infer<typeof MessagePartSchema>;
export type MessageStep = z.infer<typeof MessageStepSchema>;
export type SystemMessage = z.infer<typeof SystemMessageSchema>;
export type TokenUsage = z.infer<typeof TokenUsageSchema>;
export type FileAttachmentInput = z.infer<typeof FileAttachmentInputSchema>;
