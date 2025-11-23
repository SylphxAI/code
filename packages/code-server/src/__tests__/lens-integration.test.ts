/**
 * Lens Integration Test
 *
 * Tests basic Lens API functionality:
 * 1. Session CRUD operations
 * 2. Field-level subscriptions
 * 3. Streaming field support
 * 4. EventStream pattern matching
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { initializeLensAPI } from "../lens/index.js";
import { AppEventStream } from "../services/app-event-stream.service.js";
import type { AppContext } from "../context.js";
import type { SessionRepository, MessageRepository } from "@sylphx/code-core";

// Mock repositories for testing
const mockSessionRepository: Partial<SessionRepository> = {
	async createSession(provider, model, agentId, enabledRuleIds) {
		return {
			id: "test-session-123",
			provider,
			model,
			agentId,
			title: "",
			enabledRuleIds,
			created_at: Date.now(),
			updated_at: Date.now(),
			messages: [],
		} as any;
	},

	async getSessionById(id: string) {
		return {
			id,
			provider: "anthropic",
			model: "claude-3.5-sonnet",
			agentId: "coder",
			title: "Test Session",
			enabledRuleIds: [],
			created_at: Date.now(),
			updated_at: Date.now(),
			messages: [],
		} as any;
	},

	async updateSession(id: string, data: any) {
		// Mock update
		console.log(`[Mock] Updated session ${id}:`, data);
	},

	async deleteSession(id: string) {
		// Mock delete
		console.log(`[Mock] Deleted session ${id}`);
	},

	async getRecentSessionsMetadata(limit: number, cursor?: number) {
		return {
			items: [
				{
					id: "session-1",
					provider: "anthropic",
					model: "claude-3.5-sonnet",
					agentId: "coder",
					title: "Session 1",
					enabledRuleIds: [],
					created_at: Date.now(),
					updated_at: Date.now(),
				},
			],
			nextCursor: null,
		} as any;
	},
};

const mockMessageRepository: Partial<MessageRepository> = {};

describe("Lens Integration", () => {
	let lensAPI: ReturnType<typeof initializeLensAPI>;
	let eventStream: AppEventStream;

	beforeAll(() => {
		// Create event stream
		eventStream = new AppEventStream(undefined, {
			bufferSize: 100,
			bufferTime: 5 * 60 * 1000,
			cleanupInterval: 0, // Disable cleanup in tests
		});

		// Create mock app context
		const mockAppContext: Partial<AppContext> = {
			database: {
				getRepository: () => mockSessionRepository as any,
				getMessageRepository: () => mockMessageRepository as any,
			} as any,
			eventStream,
		};

		// Initialize Lens API
		lensAPI = initializeLensAPI(mockAppContext as AppContext);
	});

	afterAll(() => {
		// Cleanup
		eventStream.destroy();
	});

	describe("Session CRUD", () => {
		it("should create a session", async () => {
			const session = await lensAPI.Session.create.mutate({
				provider: "anthropic",
				model: "claude-3.5-sonnet",
				agentId: "coder",
				title: "New Session",
				enabledRuleIds: [],
			});

			expect(session).toBeDefined();
			expect(session.id).toBe("test-session-123");
			expect(session.provider).toBe("anthropic");
			expect(session.model).toBe("claude-3.5-sonnet");
		});

		it("should get a session by ID", async () => {
			const session = await lensAPI.Session.get.query({ id: "test-session-123" });

			expect(session).toBeDefined();
			expect(session?.id).toBe("test-session-123");
			expect(session?.title).toBe("Test Session");
		});

		it("should list sessions", async () => {
			const sessions = await lensAPI.Session.list.query({ limit: 10 });

			expect(sessions).toBeDefined();
			expect(Array.isArray(sessions)).toBe(true);
			expect(sessions.length).toBeGreaterThan(0);
		});

		it("should update a session", async () => {
			const updated = await lensAPI.Session.update.mutate({
				id: "test-session-123",
				data: {
					title: "Updated Title",
				},
			});

			expect(updated).toBeDefined();
			expect(updated.id).toBe("test-session-123");
		});
	});

	describe("EventStream Pattern Matching", () => {
		it("should support pattern matching for field updates", (done) => {
			const pattern = /^session:.*:field:.*$/;
			const events: any[] = [];

			// Subscribe to pattern
			const subscription = eventStream.subscribePattern(pattern).subscribe({
				next: (event) => {
					events.push(event);
				},
			});

			// Publish some field update events
			eventStream
				.publish("session:123:field:title", {
					type: "update",
					data: {
						entityId: "123",
						fieldName: "title",
						type: "change",
						value: "New Title",
					},
				})
				.then(() =>
					eventStream.publish("session:123:field:status", {
						type: "update",
						data: {
							entityId: "123",
							fieldName: "status",
							type: "change",
							value: "active",
						},
					}),
				)
				.then(() => {
					// Give some time for events to propagate
					setTimeout(() => {
						expect(events.length).toBe(2);
						expect(events[0].channel).toBe("session:123:field:title");
						expect(events[1].channel).toBe("session:123:field:status");

						subscription.unsubscribe();
						done();
					}, 100);
				});
		});

		it("should filter events by specific session", (done) => {
			// Use unique session IDs to avoid interference from other tests
			const sessionId = `test-${Date.now()}`;
			const pattern = new RegExp(`^session:${sessionId}:field:.*$`);
			const events: any[] = [];

			// Subscribe to specific session only
			const subscription = eventStream.subscribePattern(pattern).subscribe({
				next: (event) => {
					events.push(event);
				},
			});

			// Publish events for different sessions
			Promise.all([
				eventStream.publish(`session:${sessionId}:field:title`, {
					type: "update",
					data: { value: `Session ${sessionId}` },
				}),
				eventStream.publish(`session:other-${Date.now()}:field:title`, {
					type: "update",
					data: { value: "Other Session" },
				}),
				eventStream.publish(`session:${sessionId}:field:status`, {
					type: "update",
					data: { value: "active" },
				}),
			]).then(() => {
				setTimeout(() => {
					// Should only receive events for our specific session
					expect(events.length).toBe(2);
					expect(events.every((e) => e.channel.startsWith(`session:${sessionId}:`))).toBe(
						true,
					);

					subscription.unsubscribe();
					done();
				}, 100);
			});
		});
	});

	describe("Lens EventStream Wrapper", () => {
		it("should provide Lens-compatible interface", () => {
			// ctx.eventStream is the Lens wrapper
			const { eventStream: lensEventStream } = lensAPI.ctx;

			expect(lensEventStream).toBeDefined();
			expect(typeof lensEventStream.publish).toBe("function");
			expect(typeof lensEventStream.subscribe).toBe("function");
			expect(typeof lensEventStream.subscribePattern).toBe("function");
			expect(typeof lensEventStream.observe).toBe("function");
		});

		it("should publish events via Lens interface", (done) => {
			const { eventStream: lensEventStream } = lensAPI.ctx;
			const events: any[] = [];

			// Subscribe via Lens interface
			const subscription = lensEventStream.subscribe("test-channel", {
				next: (data) => {
					events.push(data);
				},
			});

			// Publish via Lens interface (sync)
			lensEventStream.publish("test-channel", { message: "Hello Lens" });

			setTimeout(() => {
				expect(events.length).toBe(1);
				expect(events[0].message).toBe("Hello Lens");

				subscription.unsubscribe();
				done();
			}, 100);
		});
	});
});
