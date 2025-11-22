import type { ProviderId } from "@sylphx/code-core";
import { z } from "zod";

// Session metadata (for lists)
export const SessionMetadataSchema = z.object({
	id: z.string(),
	title: z.string(),
	provider: z.string() as z.ZodType<ProviderId>,
	model: z.string(),
	agentId: z.string(),
	enabledRuleIds: z.array(z.string()),
	createdAt: z.number(),
	updatedAt: z.number(),
	messageCount: z.number().optional(),
});

export type SessionMetadata = z.infer<typeof SessionMetadataSchema>;

// Full session (with messages and todos)
export const SessionSchema = SessionMetadataSchema.extend({
	messages: z.array(z.any()).optional(), // MessageSchema defined in message.schemas
	todos: z.array(z.any()).optional(), // TodoSchema defined in todo.schemas
	modelStatus: z.enum(["available", "unavailable", "unknown"]).optional(),
});

export type Session = z.infer<typeof SessionSchema>;

// Paginated response
export const PaginatedSessionsSchema = z.object({
	sessions: z.array(SessionMetadataSchema),
	nextCursor: z.number().optional(),
	hasMore: z.boolean(),
});

export type PaginatedSessions = z.infer<typeof PaginatedSessionsSchema>;
