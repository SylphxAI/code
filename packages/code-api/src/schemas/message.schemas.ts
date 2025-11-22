import { z } from "zod";

// Message part types
export const MessagePartSchema = z.union([
	z.object({ type: z.literal("text"), content: z.string() }),
	z.object({
		type: z.literal("tool-use"),
		toolUseId: z.string(),
		toolName: z.string(),
		toolInput: z.unknown(),
	}),
	z.object({
		type: z.literal("tool-result"),
		toolUseId: z.string(),
		toolName: z.string(),
		content: z.string(),
		isError: z.boolean().optional(),
	}),
	z.object({
		type: z.literal("reasoning"),
		reasoning: z.string(),
	}),
]);

export type MessagePart = z.infer<typeof MessagePartSchema>;

// Token usage
export const TokenUsageSchema = z.object({
	promptTokens: z.number(),
	completionTokens: z.number(),
	totalTokens: z.number(),
});

export type TokenUsage = z.infer<typeof TokenUsageSchema>;

// Message metadata
export const MessageMetadataSchema = z.object({
	agentId: z.string().optional(),
	ruleIds: z.array(z.string()).optional(),
	isCommandExecution: z.boolean().optional(),
});

export type MessageMetadata = z.infer<typeof MessageMetadataSchema>;

// Message schema
export const MessageSchema = z.object({
	id: z.string(),
	sessionId: z.string(),
	role: z.enum(["user", "assistant", "system"]),
	parts: z.array(MessagePartSchema),
	createdAt: z.number(),
	tokenUsage: TokenUsageSchema.optional(),
	metadata: MessageMetadataSchema.optional(),
});

export type Message = z.infer<typeof MessageSchema>;

// Streaming event types
export const StreamEventSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("text-delta"), textDelta: z.string() }),
	z.object({
		type: z.literal("tool-use-start"),
		toolUseId: z.string(),
		toolName: z.string(),
	}),
	z.object({ type: z.literal("tool-use-delta"), toolInputDelta: z.string() }),
	z.object({
		type: z.literal("tool-result"),
		toolUseId: z.string(),
		toolName: z.string(),
		content: z.string(),
		isError: z.boolean().optional(),
	}),
	z.object({ type: z.literal("message-complete"), message: MessageSchema }),
	z.object({ type: z.literal("error"), error: z.string() }),
]);

export type StreamEvent = z.infer<typeof StreamEventSchema>;
