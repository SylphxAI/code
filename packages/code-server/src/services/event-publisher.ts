/**
 * Event Publisher Utilities
 * Centralizes event publishing logic for multi-channel scenarios
 */

import type { EventStream } from "./event-stream.service.js";

/**
 * Publish session title update (model-level event)
 * Emits session-updated with partial session containing title
 * Frontend subscriptions will merge this with existing session state
 *
 * Publishes to both channels:
 * - session:${sessionId} - for clients viewing that specific session
 * - session-events - for global sidebar sync across all clients
 */
export async function publishTitleUpdate(
	eventStream: EventStream,
	sessionId: string,
	title: string,
): Promise<void> {
	const sessionUpdate = {
		id: sessionId,
		title,
		updatedAt: Date.now(),
	};

	await Promise.all([
		// Session-specific channel - Lens format (entity directly)
		eventStream.publish(`session:${sessionId}`, sessionUpdate),
		// Global channel (sidebar sync for all clients)
		eventStream.publish("session-events", {
			type: "session-updated" as const,
			sessionId,
			session: sessionUpdate,
		}),
	]);
}

/**
 * Publish session creation to global channel
 */
export async function publishSessionCreated(
	eventStream: EventStream,
	sessionId: string,
	provider: string,
	model: string,
): Promise<void> {
	await eventStream.publish("session-events", {
		type: "session-created" as const,
		sessionId,
		provider,
		model,
	});
}

/**
 * Publish session deletion to global channel
 */
export async function publishSessionDeleted(
	eventStream: EventStream,
	sessionId: string,
): Promise<void> {
	await eventStream.publish("session-events", {
		type: "session-deleted" as const,
		sessionId,
	});
}

/**
 * Publish session model update to global channel
 */
export async function publishModelUpdate(
	eventStream: EventStream,
	sessionId: string,
	model: string,
): Promise<void> {
	await eventStream.publish("session-events", {
		type: "session-model-updated" as const,
		sessionId,
		model,
	});
}

/**
 * Publish session provider update to global channel
 */
export async function publishProviderUpdate(
	eventStream: EventStream,
	sessionId: string,
	provider: string,
	model: string,
): Promise<void> {
	await eventStream.publish("session-events", {
		type: "session-provider-updated" as const,
		sessionId,
		provider,
		model,
	});
}
