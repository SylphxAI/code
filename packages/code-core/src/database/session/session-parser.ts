/**
 * Session data parsing and transformation
 * Handles Zod schemas, JSON parsing, and data migration/validation
 */

import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { eq, inArray } from "drizzle-orm";
import {
	sessions,
	messages,
	messageSteps,
	stepParts,
	stepUsage,
	todos,
} from "../schema.js";
import type {
	SessionMessage,
	MessageStep,
	MessagePart,
	TokenUsage,
} from "../../types/session.types.js";
import type { Todo as TodoType } from "../../types/todo.types.js";
import type { SessionRow } from "./types.js";
import {
	MessagePartSchema,
	StringArraySchema,
} from "../../schemas/message.schemas.js";
import { logger } from "../../utils/logger.js";

/**
 * Parse and validate enabledRuleIds from raw database value
 */
export function parseEnabledRuleIds(raw: unknown): string[] {
	if (!raw) return [];

	try {
		const parsed = StringArraySchema.safeParse(
			typeof raw === "string" ? JSON.parse(raw) : raw,
		);
		return parsed.success ? parsed.data : [];
	} catch {
		return [];
	}
}

/**
 * Parse and validate optional string array from raw database value
 */
export function parseOptionalStringArray(raw: unknown): string[] | null {
	if (!raw) return null;

	try {
		const parsed = StringArraySchema.safeParse(
			typeof raw === "string" ? JSON.parse(raw) : raw,
		);
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}

/**
 * Parse raw session record and fix corrupted data
 */
export async function parseSessionRow(
	raw: Record<string, unknown>,
	db: LibSQLDatabase,
): Promise<SessionRow | null> {
	try {
		// Parse and validate enabledRuleIds
		let enabledRuleIds: string[] = [];
		if (raw.enabled_rule_ids) {
			const parsed = StringArraySchema.safeParse(
				JSON.parse(raw.enabled_rule_ids as string),
			);
			if (parsed.success) {
				enabledRuleIds = parsed.data;
			} else {
				// Corrupted JSON - default to empty array and fix it
				enabledRuleIds = [];
				await db
					.update(sessions)
					.set({ enabledRuleIds: [] })
					.where(eq(sessions.id, raw.id as string));
			}
		}

		// Parse and validate toolIds
		let toolIds: string[] | null = null;
		if (raw.tool_ids) {
			const parsed = StringArraySchema.safeParse(
				JSON.parse(raw.tool_ids as string),
			);
			if (parsed.success) {
				toolIds = parsed.data;
			}
		}

		// Parse and validate mcpServerIds
		let mcpServerIds: string[] | null = null;
		if (raw.mcp_server_ids) {
			const parsed = StringArraySchema.safeParse(
				JSON.parse(raw.mcp_server_ids as string),
			);
			if (parsed.success) {
				mcpServerIds = parsed.data;
			}
		}

		return {
			id: raw.id as string,
			title: raw.title as string | null,
			modelId: raw.model_id as string | null,
			provider: raw.provider as string | null,
			model: raw.model as string | null,
			agentId: raw.agent_id as string,
			enabledRuleIds,
			toolIds,
			mcpServerIds,
			nextTodoId: raw.next_todo_id as number,
			created: raw.created as number,
			updated: raw.updated as number,
			flags: raw.flags as Record<string, boolean> | undefined,
			baseContextTokens: raw.base_context_tokens as number | undefined,
			totalTokens: raw.total_tokens as number | undefined,
		};
	} catch {
		// Skip this session - too corrupted to parse
		return null;
	}
}

/**
 * Get messages for a session with step-based structure
 * Assembles steps, parts, attachments, usage into SessionMessage format
 * OPTIMIZED: Batch queries instead of N+1 queries
 */
export async function getSessionMessages(
	db: LibSQLDatabase,
	sessionId: string,
): Promise<SessionMessage[]> {
	// Get all messages for session
	const messageRecords = await db
		.select()
		.from(messages)
		.where(eq(messages.sessionId, sessionId))
		.orderBy(messages.ordering);

	if (messageRecords.length === 0) {
		return [];
	}

	// Batch fetch all related data (MASSIVE performance improvement!)
	const messageIds = messageRecords.map((m) => m.id);

	// Get all steps for all messages
	const allSteps = await db
		.select()
		.from(messageSteps)
		.where(inArray(messageSteps.messageId, messageIds))
		.orderBy(messageSteps.stepIndex);

	const stepIds = allSteps.map((s) => s.id);

	// Fetch all step-related data in parallel
	const [allParts, allStepUsage] = await Promise.all([
		// Step parts
		db
			.select()
			.from(stepParts)
			.where(inArray(stepParts.stepId, stepIds))
			.orderBy(stepParts.ordering),

		// Step usage
		db.select().from(stepUsage).where(inArray(stepUsage.stepId, stepIds)),
	]);

	// Group by step ID
	const partsByStep = new Map<string, typeof allParts>();
	const usageByStep = new Map<string, (typeof allStepUsage)[0]>();

	for (const part of allParts) {
		if (!partsByStep.has(part.stepId)) {
			partsByStep.set(part.stepId, []);
		}
		partsByStep.get(part.stepId)!.push(part);
	}

	for (const usage of allStepUsage) {
		usageByStep.set(usage.stepId, usage);
	}

	// Group by message ID
	const stepsByMessage = new Map<string, typeof allSteps>();

	for (const step of allSteps) {
		if (!stepsByMessage.has(step.messageId)) {
			stepsByMessage.set(step.messageId, []);
		}
		stepsByMessage.get(step.messageId)!.push(step);
	}

	// Assemble messages using grouped data
	const fullMessages = messageRecords.map((msg) => {
		const steps = stepsByMessage.get(msg.id) || [];

		// Compute message usage from step usage
		let messageUsage: TokenUsage | undefined;
		const stepUsages = steps
			.map((s) => usageByStep.get(s.id))
			.filter((u): u is NonNullable<typeof u> => u !== undefined);

		if (stepUsages.length > 0) {
			messageUsage = {
				promptTokens: stepUsages.reduce((sum, u) => sum + u.promptTokens, 0),
				completionTokens: stepUsages.reduce(
					(sum, u) => sum + u.completionTokens,
					0,
				),
				totalTokens: stepUsages.reduce((sum, u) => sum + u.totalTokens, 0),
			};
		}

		// Build steps
		const messageSteps: MessageStep[] = steps.map((step) => {
			const parts = partsByStep.get(step.id) || [];
			const stepUsageData = usageByStep.get(step.id);

			// Parse message parts with validation
			const parsedParts = parts.map((p) => {
				const parsed = MessagePartSchema.safeParse(JSON.parse(p.content));
				if (!parsed.success) {
					// Validation failed - log and return fallback
					logger.error("Invalid MessagePart", parsed.error as Error);
					return JSON.parse(p.content) as MessagePart;
				}
				return parsed.data;
			});

			const messageStep: MessageStep = {
				id: step.id,
				stepIndex: step.stepIndex,
				parts: parsedParts,
				status:
					(step.status as "active" | "completed" | "error" | "abort") ||
					"completed",
			};

			// Note: metadata field removed from MessageStep - no longer stored per-step
			// System status (cpu, memory) tracking removed for performance

			if (stepUsageData) {
				messageStep.usage = {
					promptTokens: stepUsageData.promptTokens,
					completionTokens: stepUsageData.completionTokens,
					totalTokens: stepUsageData.totalTokens,
				};
			}

			if (step.provider) {
				messageStep.provider = step.provider;
			}

			if (step.model) {
				messageStep.model = step.model;
			}

			if (step.duration) {
				messageStep.duration = step.duration;
			}

			if (step.finishReason) {
				messageStep.finishReason = step.finishReason as
					| "stop"
					| "tool-calls"
					| "length"
					| "error";
			}

			if (step.startTime) {
				messageStep.startTime = step.startTime;
			}

			if (step.endTime) {
				messageStep.endTime = step.endTime;
			}

			return messageStep;
		});

		const sessionMessage: SessionMessage = {
			id: msg.id,
			role: msg.role as "user" | "assistant",
			steps: messageSteps,
			timestamp: msg.timestamp,
			status:
				(msg.status as "active" | "completed" | "error" | "abort") ||
				"completed",
		};

		// Aggregated usage (computed from step usage)
		if (messageUsage) {
			sessionMessage.usage = messageUsage;
		}

		// Final finish reason (from last step or message-level)
		if (msg.finishReason) {
			sessionMessage.finishReason = msg.finishReason;
		}

		return sessionMessage;
	});

	return fullMessages;
}

/**
 * Get todos for a session
 */
export async function getSessionTodos(
	db: LibSQLDatabase,
	sessionId: string,
): Promise<TodoType[]> {
	const todoRecords = await db
		.select()
		.from(todos)
		.where(eq(todos.sessionId, sessionId))
		.orderBy(todos.ordering);

	return todoRecords.map((t) => ({
		id: t.id,
		content: t.content,
		activeForm: t.activeForm,
		status: t.status as "pending" | "in_progress" | "completed",
		ordering: t.ordering,
	}));
}
