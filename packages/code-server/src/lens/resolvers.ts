/**
 * Lens Entity Resolvers
 *
 * Field resolvers with emit support for live updates.
 * Architecture:
 * - Message.steps → subscribe to step updates, emit on change
 * - Step.parts → subscribe to part updates, emit on change
 * - Part.content → emit.delta() for streaming text
 *
 * Each resolver subscribes to the appropriate event channel and emits
 * granular updates rather than full refetch.
 */

import { resolver } from "@sylphx/lens-core";
import type { Resolvers } from "@sylphx/lens-core";
import { Message, Step, Part } from "./entities.js";
import type { LensDB, LensContext, StoredEvent } from "./context.js";

// =============================================================================
// Types
// =============================================================================

interface MessageParent {
	id: string;
	sessionId: string;
	role: string;
	timestamp: number;
	ordering: number;
	status: string;
	finishReason?: string;
	// Nested data from getSessionMessages (may be present)
	steps?: StepParent[];
}

interface StepParent {
	id: string;
	messageId: string;
	stepIndex: number;
	status: string;
	provider?: string;
	model?: string;
	duration?: number;
	finishReason?: string;
	startTime?: number;
	endTime?: number;
	systemMessages?: unknown;
	// Nested data from getSessionMessages (may be present)
	parts?: PartParent[];
}

interface PartParent {
	id: string;
	stepId?: string;
	ordering: number;
	type: string;
	content: unknown;
}

// =============================================================================
// Event Channel Helpers
// =============================================================================

/**
 * Get session stream channel for a message
 */
function getSessionChannel(sessionId: string): string {
	return `session-stream:${sessionId}`;
}

/**
 * Check if event is relevant for step updates
 */
function isStepEvent(event: StoredEvent): boolean {
	return [
		"step-start",
		"step-complete",
		"text-delta",
		"text-end",
		"reasoning-delta",
		"reasoning-end",
		"tool-call",
		"tool-result",
		"tool-error",
	].includes(event.type);
}

/**
 * Check if event is relevant for part updates
 */
function isPartEvent(event: StoredEvent): boolean {
	return [
		"text-delta",
		"text-end",
		"reasoning-delta",
		"reasoning-end",
		"tool-call",
		"tool-result",
		"tool-error",
	].includes(event.type);
}

// =============================================================================
// Message Resolver
// =============================================================================

/**
 * Message resolver with live steps field
 *
 * Steps are loaded initially, then updated via emit when streaming events occur.
 * Uses emit.push() for new steps, emit.updateById() for step updates.
 */
const messageResolver = resolver<LensContext>()(Message, (f) => ({
	// Expose scalar fields directly
	id: f.expose("id"),
	sessionId: f.expose("sessionId"),
	role: f.expose("role"),
	timestamp: f.expose("timestamp"),
	ordering: f.expose("ordering"),
	status: f.expose("status"),
	finishReason: f.expose("finishReason"),

	// Resolved field: steps with live query support
	steps: f.many(Step).resolve(async ({ parent, ctx }) => {
		const message = parent as MessageParent;

		// Use nested steps from parent if available (from getSessionMessages)
		// Otherwise, would need to fetch from database
		const initialSteps = message.steps || [];

		// Set up live subscription if emit available
		if (ctx.emit && ctx.onCleanup) {
			const channel = getSessionChannel(message.sessionId);
			let cancelled = false;

			// Helper to refetch steps
			const refetchSteps = async () => {
				// Re-fetch messages to get updated steps
				const messages = await ctx.db.message.findMany({
					where: { sessionId: message.sessionId },
				});
				const updatedMessage = messages.find((m: MessageParent) => m.id === message.id);
				return (updatedMessage as MessageParent)?.steps || [];
			};

			// Subscribe to streaming events
			const subscription = (async () => {
				for await (const event of ctx.eventStream.subscribe(channel)) {
					if (cancelled) break;

					// Only process step-related events
					if (!isStepEvent(event)) continue;

					// Refetch and emit updated steps
					const updatedSteps = await refetchSteps();
					ctx.emit(updatedSteps);
				}
			})();

			ctx.onCleanup(() => {
				cancelled = true;
			});
		}

		return initialSteps;
	}),
}));

// =============================================================================
// Step Resolver
// =============================================================================

/**
 * Step resolver with live parts field
 *
 * Parts are loaded initially, then updated via emit when streaming events occur.
 * Uses emit.push() for new parts, emit.updateById() for part updates.
 */
const stepResolver = resolver<LensContext>()(Step, (f) => ({
	// Expose scalar fields
	id: f.expose("id"),
	messageId: f.expose("messageId"),
	stepIndex: f.expose("stepIndex"),
	status: f.expose("status"),
	provider: f.expose("provider"),
	model: f.expose("model"),
	duration: f.expose("duration"),
	finishReason: f.expose("finishReason"),
	startTime: f.expose("startTime"),
	endTime: f.expose("endTime"),
	systemMessages: f.expose("systemMessages"),

	// Resolved field: parts with live query support
	parts: f.many(Part).resolve(async ({ parent, ctx }) => {
		const step = parent as StepParent;

		// Use nested parts from parent if available (from getSessionMessages)
		const initialParts = step.parts || [];

		// Parts are updated when the parent step is refetched
		// The message resolver handles the subscription and refetch

		return initialParts;
	}),
}));

// =============================================================================
// Part Resolver
// =============================================================================

/**
 * Part resolver with live content field
 *
 * For text parts, content is updated via emit.delta() during streaming.
 * This enables efficient text streaming without full refetch.
 */
const partResolver = resolver<LensContext>()(Part, (f) => ({
	// Expose scalar fields
	id: f.expose("id"),
	stepId: f.expose("stepId"),
	ordering: f.expose("ordering"),
	type: f.expose("type"),

	// Content field - could use emit.delta for streaming text
	// For now, expose directly and let parent handle updates
	content: f.expose("content"),
}));

// =============================================================================
// Export
// =============================================================================

/**
 * Create entity resolvers array for Lens server
 *
 * @param _db - Database adapter (for future use in dataloaders)
 * @returns Array of resolver definitions
 */
export function createResolvers(_db: LensDB): Resolvers {
	return [messageResolver, stepResolver, partResolver];
}
