/**
 * Session Extended API
 *
 * Extends Lens's auto-generated CRUD with business-specific operations.
 *
 * Philosophy:
 * - Lens provides: create, get, list, update, delete (field-agnostic)
 * - We add: business logic, domain operations, complex queries
 *
 * Architecture:
 * - Uses Lens's QueryContext for database and event stream access
 * - Publishes field-level events for all updates
 * - Maintains same patterns as Lens core API
 */

import type { QueryContext } from "@sylphx/lens-core";
import type { SessionRepository } from "@sylphx/code-core";
import type { AppContext } from "../context.js";
import { publishTitleUpdate } from "../services/event-publisher.js";

/**
 * Session Extended Operations
 *
 * Business-specific operations beyond basic CRUD
 */
export function createSessionExtendedAPI(appContext: AppContext, ctx: QueryContext) {
	const sessionRepository = appContext.database.getRepository() as SessionRepository;

	return {
		/**
		 * Get last session (for headless mode)
		 */
		async getLast() {
			return await sessionRepository.getLastSession();
		},

		/**
		 * Search sessions by title
		 *
		 * @param query - Search query string
		 * @param limit - Max results (default: 20)
		 * @param cursor - Pagination cursor
		 * @returns Matching sessions with pagination
		 */
		async search(query: string, limit: number = 20, cursor?: number) {
			return await sessionRepository.searchSessionsMetadata(query, limit, cursor);
		},

		/**
		 * Get session count
		 */
		async getCount() {
			return await sessionRepository.getSessionCount();
		},

		/**
		 * Update session title
		 *
		 * Uses Lens field-level update pattern:
		 * 1. Update via Lens API (triggers afterUpdate hook)
		 * 2. afterUpdate publishes session:${id}:field:title event
		 * 3. Frontend receives field-specific update
		 *
		 * @param sessionId - Session ID
		 * @param title - New title
		 */
		async updateTitle(sessionId: string, title: string) {
			// Use Lens update API (will trigger field-level events)
			await sessionRepository.updateSession(sessionId, { title });

			// Legacy event for backward compatibility
			await publishTitleUpdate(appContext.eventStream, sessionId, title);
		},

		/**
		 * Update session model
		 */
		async updateModel(sessionId: string, model: string) {
			await sessionRepository.updateSession(sessionId, { model });

			// Publish model-updated event
			await appContext.eventStream.publish("session-events", {
				type: "session-model-updated",
				sessionId,
				model,
			});
		},

		/**
		 * Update session provider
		 */
		async updateProvider(sessionId: string, provider: string) {
			await sessionRepository.updateSession(sessionId, { provider });

			// Publish provider-updated event
			await appContext.eventStream.publish("session-events", {
				type: "session-provider-updated",
				sessionId,
				provider,
			});
		},

		/**
		 * Update session rules
		 */
		async updateRules(sessionId: string, enabledRuleIds: string[]) {
			await sessionRepository.updateSession(sessionId, { enabledRuleIds });

			// Publish rules-updated event
			await appContext.eventStream.publish("session-events", {
				type: "session-rules-updated",
				sessionId,
				enabledRuleIds,
			});
		},

		/**
		 * Update session agent
		 */
		async updateAgent(sessionId: string, agentId: string) {
			await sessionRepository.updateSession(sessionId, { agentId });

			// Publish agent-updated event
			await appContext.eventStream.publish("session-events", {
				type: "session-agent-updated",
				sessionId,
				agentId,
			});
		},

		/**
		 * Compact session (remove intermediate messages, keep only final results)
		 *
		 * Complex operation with:
		 * - Message deletion
		 * - Title regeneration
		 * - Event publishing
		 */
		async compact(sessionId: string) {
			const session = await sessionRepository.getSessionById(sessionId);
			if (!session) {
				throw new Error(`Session ${sessionId} not found`);
			}

			// Get message repository
			const messageRepository = appContext.database.getMessageRepository();

			// Compact logic (from original router)
			const messages = session.messages || [];
			const toolUseMessages = new Set<string>();

			// Find all messages with tool_use content
			for (const msg of messages) {
				if (msg.content) {
					for (const block of msg.content) {
						if (block.type === "tool_use") {
							toolUseMessages.add(block.id);
						}
					}
				}
			}

			// Collect messages to delete (tool_result without corresponding tool_use)
			const messagesToDelete: string[] = [];
			for (const msg of messages) {
				if (msg.content) {
					for (const block of msg.content) {
						if (block.type === "tool_result" && !toolUseMessages.has(block.tool_use_id)) {
							messagesToDelete.push(msg.id);
							break;
						}
					}
				}
			}

			// Delete messages
			for (const messageId of messagesToDelete) {
				await messageRepository.deleteMessage(messageId);
			}

			// Regenerate title if needed
			if (!session.title || session.title === "") {
				// Trigger title generation via agent manager
				// This will stream title updates via field-level events
				const { agentManager } = appContext;
				await agentManager.generateSessionTitle(sessionId);
			}

			// Publish compact event
			await appContext.eventStream.publish("session-events", {
				type: "session-compacted",
				sessionId,
				deletedCount: messagesToDelete.length,
			});

			return {
				sessionId,
				deletedCount: messagesToDelete.length,
			};
		},

		/**
		 * Get context info (tokens, costs, etc.)
		 */
		async getContextInfo(sessionId: string) {
			// Complex calculation involving messages, tokens, costs
			// This is a derived/computed value, not stored in database
			const session = await sessionRepository.getSessionById(sessionId);
			if (!session) {
				return null;
			}

			const messages = session.messages || [];

			// Calculate total tokens
			let totalInputTokens = 0;
			let totalOutputTokens = 0;

			for (const msg of messages) {
				if (msg.usage) {
					totalInputTokens += msg.usage.input_tokens || 0;
					totalOutputTokens += msg.usage.output_tokens || 0;
				}
			}

			const totalTokens = totalInputTokens + totalOutputTokens;

			// Estimate cost (simplified - actual cost depends on model pricing)
			const { model } = session;
			const costPerMillionInputTokens = this.getModelCost(model, "input");
			const costPerMillionOutputTokens = this.getModelCost(model, "output");

			const totalCost =
				(totalInputTokens / 1_000_000) * costPerMillionInputTokens +
				(totalOutputTokens / 1_000_000) * costPerMillionOutputTokens;

			return {
				sessionId,
				messageCount: messages.length,
				totalTokens,
				totalInputTokens,
				totalOutputTokens,
				totalCost,
				model: session.model,
				provider: session.provider,
			};
		},

		/**
		 * Get total tokens across all sessions
		 */
		async getTotalTokens() {
			// This is an expensive operation - should be cached
			const sessions = await sessionRepository.getRecentSessionsMetadata(1000);

			let totalTokens = 0;

			for (const session of sessions.items) {
				const contextInfo = await this.getContextInfo(session.id);
				if (contextInfo) {
					totalTokens += contextInfo.totalTokens;
				}
			}

			return { totalTokens };
		},

		/**
		 * Helper: Get model cost per million tokens
		 *
		 * TODO: Load from config or pricing API
		 */
		getModelCost(model: string, type: "input" | "output"): number {
			// Simplified pricing (should come from config)
			const pricing: Record<string, { input: number; output: number }> = {
				"claude-3.5-sonnet": { input: 3.0, output: 15.0 },
				"claude-3-opus": { input: 15.0, output: 75.0 },
				"claude-3-haiku": { input: 0.25, output: 1.25 },
				"gpt-4": { input: 30.0, output: 60.0 },
				"gpt-3.5-turbo": { input: 0.5, output: 1.5 },
			};

			return pricing[model]?.[type] || 0;
		},
	};
}
