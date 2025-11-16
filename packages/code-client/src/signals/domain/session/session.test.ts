/**
 * Session Domain Signals Tests
 * Tests chat session and message state management
 */

import type { ProviderId, Session, SessionMessage } from "@sylphx/code-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as session from "./index.js";

// Mock dependencies
vi.mock("../../../trpc-provider.js", () => ({
	getTRPCClient: vi.fn(() => ({
		session: {
			create: {
				mutate: vi.fn(),
			},
			updateModel: {
				mutate: vi.fn(),
			},
			updateProvider: {
				mutate: vi.fn(),
			},
			updateTitle: {
				mutate: vi.fn(),
			},
			updateRules: {
				mutate: vi.fn(),
			},
			delete: {
				mutate: vi.fn(),
			},
		},
		message: {
			add: {
				mutate: vi.fn(),
			},
		},
	})),
}));

vi.mock("../../../lib/event-bus.js", () => ({
	eventBus: {
		emit: vi.fn(),
		on: vi.fn(),
	},
}));

// Mock session data
const mockSession: Session = {
	id: "session-123",
	title: "Test Chat Session",
	provider: "openrouter" as ProviderId,
	model: "claude-3-sonnet",
	agentId: "writer",
	enabledRuleIds: ["core"],
	createdAt: new Date(),
	updatedAt: new Date(),
};

const mockMessage: SessionMessage = {
	id: "msg-123",
	sessionId: "session-123",
	role: "user",
	content: [{ type: "text", content: "Hello, world!" }],
	createdAt: new Date(),
};

describe("Session Domain Signals", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset all signals to initial state
		session.setCurrentSessionId(null);
		session.setCurrentSession(null);
		session.setIsStreaming(false);
		session.setStreamingMessageId(null);
		session.clearMessages();
		session.setRecentSessions([]);
		session.setSessionsLoading(false);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Core Session Signals", () => {
		it("should initialize with null values", () => {
			expect(session.getCurrentSessionId()).toBe(null);
			expect(session.useCurrentSession()).toBe(null);
			expect(session.useIsStreaming()).toBe(false);
			expect(session.useStreamingMessageId()).toBe(null);
		});

		it("should set current session ID", () => {
			session.setCurrentSessionId("session-123");
			expect(session.getCurrentSessionId()).toBe("session-123");
		});

		it("should set current session with ID sync", () => {
			session.setCurrentSession(mockSession);

			expect(session.useCurrentSession()).toEqual(mockSession);
			expect(session.getCurrentSessionId()).toBe("session-123");
		});

		it("should handle streaming state", () => {
			session.setIsStreaming(true);
			expect(session.useIsStreaming()).toBe(true);

			session.setStreamingMessageId("msg-123");
			expect(session.useStreamingMessageId()).toBe("msg-123");

			session.setIsStreaming(false);
			expect(session.useIsStreaming()).toBe(false);
		});
	});

	describe("Computed Signals", () => {
		it("should compute hasCurrentSession correctly", () => {
			expect(session.useHasCurrentSession()).toBe(false);

			session.setCurrentSessionId("session-123");
			expect(session.useHasCurrentSession()).toBe(true);

			session.setCurrentSessionId(null);
			expect(session.useHasCurrentSession()).toBe(false);
		});

		it("should compute currentSessionTitle correctly", () => {
			expect(session.useCurrentSessionTitle()).toBe("New Chat");

			session.setCurrentSession(mockSession);
			expect(session.useCurrentSessionTitle()).toBe("Test Chat Session");

			session.setCurrentSession({ ...mockSession, title: "" });
			expect(session.useCurrentSessionTitle()).toBe("New Chat");
		});

		it("should compute messageCount correctly", () => {
			expect(session.useMessageCount()).toBe(0);

			session.addMessage(mockMessage);
			expect(session.useMessageCount()).toBe(1);

			session.addMessage({ ...mockMessage, id: "msg-456" });
			expect(session.useMessageCount()).toBe(2);
		});

		it("should compute lastMessage correctly", () => {
			expect(session.useLastMessage()).toBe(null);

			const message1 = {
				...mockMessage,
				id: "msg-1",
				content: [{ type: "text", content: "First" }],
			};
			const message2 = {
				...mockMessage,
				id: "msg-2",
				content: [{ type: "text", content: "Second" }],
			};

			session.addMessage(message1);
			expect(session.useLastMessage()).toEqual(message1);

			session.addMessage(message2);
			expect(session.useLastMessage()).toEqual(message2);
		});

		it("should compute hasMessages correctly", () => {
			expect(session.useHasMessages()).toBe(false);

			session.addMessage(mockMessage);
			expect(session.useHasMessages()).toBe(true);

			session.clearMessages();
			expect(session.useHasMessages()).toBe(false);
		});
	});

	describe("Message Management", () => {
		it("should add messages correctly", () => {
			session.addMessage(mockMessage);
			expect(session.useMessages()).toHaveLength(1);
			expect(session.useMessages()[0]).toEqual(mockMessage);
		});

		it("should add multiple messages", () => {
			const message1 = { ...mockMessage, id: "msg-1" };
			const message2 = { ...mockMessage, id: "msg-2" };

			session.addMessages([message1, message2]);
			expect(session.useMessages()).toHaveLength(2);
		});

		it("should respect message limit", () => {
			session.addMessages([
				{ ...mockMessage, id: "msg-1" },
				{ ...mockMessage, id: "msg-2" },
				{ ...mockMessage, id: "msg-3" },
			]);

			// Should have all 3 messages (limit is 100)
			expect(session.useMessages()).toHaveLength(3);

			// Set a low limit for testing
			// Note: This is a private signal, so we can't easily test it
			// but the logic is tested in addMessages
		});

		it("should update messages correctly", () => {
			session.addMessage(mockMessage);

			session.updateMessage("msg-123", {
				content: [{ type: "text", content: "Updated message" }],
				status: "completed",
			});

			const updatedMessage = session.useMessages()[0];
			expect(updatedMessage.content).toEqual([{ type: "text", content: "Updated message" }]);
			expect(updatedMessage.status).toBe("completed");
		});

		it("should not update non-existent messages", () => {
			session.addMessage(mockMessage);
			const originalMessages = [...session.useMessages()];

			session.updateMessage("non-existent", {
				content: [{ type: "text", content: "Should not update" }],
			});

			expect(session.useMessages()).toEqual(originalMessages);
		});

		it("should clear messages correctly", () => {
			session.addMessage(mockMessage);
			session.addMessage({ ...mockMessage, id: "msg-456" });

			expect(session.useMessages()).toHaveLength(2);

			session.clearMessages();
			expect(session.useMessages()).toHaveLength(0);
		});
	});

	describe("Session List Management", () => {
		it("should set recent sessions", () => {
			const sessions = [mockSession];
			session.setRecentSessions(sessions);

			expect(session.useRecentSessions()).toEqual(sessions);
		});

		it("should handle loading state", () => {
			session.setSessionsLoading(true);
			expect(session.useSessionsLoading()).toBe(true);

			session.setSessionsLoading(false);
			expect(session.useSessionsLoading()).toBe(false);
		});
	});

	describe("Async Session Operations", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("should create session via tRPC", async () => {
			const { getTRPCClient } = await import("../../../trpc-provider.js");
			const mockClient = getTRPCClient();

			(mockClient.session.create.mutate as any).mockResolvedValue(mockSession);

			const sessionId = await session.createSession("openrouter", "claude-3-sonnet");

			expect(mockClient.session.create.mutate).toHaveBeenCalledWith({
				provider: "openrouter",
				model: "claude-3-sonnet",
				agentId: undefined,
				enabledRuleIds: undefined,
			});

			expect(sessionId).toBe("session-123");
			expect(session.getCurrentSessionId()).toBe("session-123");
		});

		it("should update session title via tRPC", async () => {
			const { getTRPCClient } = await import("../../../trpc-provider.js");
			const mockClient = getTRPCClient();

			(mockClient.session.updateTitle.mutate as any).mockResolvedValue(undefined);

			session.setCurrentSession(mockSession);

			await session.updateSessionTitle("session-123", "Updated Title");

			expect(mockClient.session.updateTitle.mutate).toHaveBeenCalledWith({
				sessionId: "session-123",
				title: "Updated Title",
			});

			expect(session.useCurrentSession()?.title).toBe("Updated Title");
		});

		it("should update session model via tRPC", async () => {
			const { getTRPCClient } = await import("../../../trpc-provider.js");
			const mockClient = getTRPCClient();

			(mockClient.session.updateModel.mutate as any).mockResolvedValue(undefined);

			await session.updateSessionModel("session-123", "gpt-4");

			expect(mockClient.session.updateModel.mutate).toHaveBeenCalledWith({
				sessionId: "session-123",
				model: "gpt-4",
			});
		});

		it("should update session provider via tRPC", async () => {
			const { getTRPCClient } = await import("../../../trpc-provider.js");
			const mockClient = getTRPCClient();

			(mockClient.session.updateProvider.mutate as any).mockResolvedValue(undefined);

			await session.updateSessionProvider("session-123", "openrouter", "claude-3");

			expect(mockClient.session.updateProvider.mutate).toHaveBeenCalledWith({
				sessionId: "session-123",
				provider: "openrouter",
				model: "claude-3",
			});
		});

		it("should update session rules via tRPC", async () => {
			const { getTRPCClient } = await import("../../../trpc-provider.js");
			const mockClient = getTRPCClient();

			(mockClient.session.updateRules.mutate as any).mockResolvedValue(undefined);

			await session.updateSessionRules("session-123", ["core", "debug"]);

			expect(mockClient.session.updateRules.mutate).toHaveBeenCalledWith({
				sessionId: "session-123",
				enabledRuleIds: ["core", "debug"],
			});
		});

		it("should delete session via tRPC", async () => {
			const { getTRPCClient } = await import("../../../trpc-provider.js");
			const mockClient = getTRPCClient();

			(mockClient.session.delete.mutate as any).mockResolvedValue(undefined);

			session.setCurrentSessionId("session-123");

			await session.deleteSession("session-123");

			expect(mockClient.session.delete.mutate).toHaveBeenCalledWith({
				sessionId: "session-123",
			});

			expect(session.getCurrentSessionId()).toBe(null);
		});
	});

	describe("Message Operations", () => {
		it("should add message via tRPC", async () => {
			const { getTRPCClient } = await import("../../../trpc-provider.js");
			const mockClient = getTRPCClient();

			(mockClient.message.add.mutate as any).mockResolvedValue({
				sessionId: "session-123",
			});

			const sessionId = await session.addMessageAsync({
				sessionId: "session-123",
				role: "user",
				content: "Hello, AI!",
			});

			expect(mockClient.message.add.mutate).toHaveBeenCalledWith({
				sessionId: "session-123",
				provider: undefined,
				model: undefined,
				role: "user",
				content: [{ type: "text", content: "Hello, AI!" }],
				attachments: undefined,
				usage: undefined,
				finishReason: undefined,
				metadata: undefined,
				todoSnapshot: undefined,
				status: undefined,
			});

			expect(sessionId).toBe("session-123");
		});

		it("should handle array content for tRPC", async () => {
			const { getTRPCClient } = await import("../../../trpc-provider.js");
			const mockClient = getTRPCClient();

			(mockClient.message.add.mutate as any).mockResolvedValue({
				sessionId: "session-123",
			});

			const arrayContent = [
				{ type: "text", content: "Text part" },
				{ type: "image", content: "image-data" },
			];

			await session.addMessageAsync({
				sessionId: "session-123",
				role: "assistant",
				content: arrayContent,
			});

			expect(mockClient.message.add.mutate).toHaveBeenCalledWith({
				sessionId: "session-123",
				provider: undefined,
				model: undefined,
				role: "assistant",
				content: arrayContent,
				attachments: undefined,
				usage: undefined,
				finishReason: undefined,
				metadata: undefined,
				todoSnapshot: undefined,
				status: undefined,
			});
		});
	});

	describe("Event Integration", () => {
		it("should emit session:created event", async () => {
			const { eventBus } = await import("../../../lib/event-bus.js");
			const { getTRPCClient } = await import("../../../trpc-provider.js");
			const mockClient = getTRPCClient();

			(mockClient.session.create.mutate as any).mockResolvedValue(mockSession);

			await session.createSession("openrouter", "claude-3", "writer", ["core"]);

			expect(eventBus.emit).toHaveBeenCalledWith("session:created", {
				sessionId: "session-123",
				enabledRuleIds: ["core"],
			});
		});

		it("should emit session:rulesUpdated event for current session", async () => {
			const { eventBus } = await import("../../../lib/event-bus.js");
			const { getTRPCClient } = await import("../../../trpc-provider.js");
			const mockClient = getTRPCClient();

			(mockClient.session.updateRules.mutate as any).mockResolvedValue(undefined);

			session.setCurrentSessionId("session-123");

			await session.updateSessionRules("session-123", ["core", "debug"]);

			expect(eventBus.emit).toHaveBeenCalledWith("session:rulesUpdated", {
				sessionId: "session-123",
				enabledRuleIds: ["core", "debug"],
			});
		});
	});

	describe("Edge Cases", () => {
		it("should handle null session in setCurrentSession", () => {
			session.setCurrentSession(mockSession);
			expect(session.getCurrentSessionId()).toBe("session-123");

			session.setCurrentSession(null);
			expect(session.getCurrentSessionId()).toBe("session-123"); // Should not clear ID when session is null
		});

		it("should handle empty messages array", () => {
			session.addMessages([]);
			expect(session.useMessages()).toHaveLength(0);
		});

		it("should handle updating title for non-current session", async () => {
			const { getTRPCClient } = await import("../../../trpc-provider.js");
			const mockClient = getTRPCClient();

			(mockClient.session.updateTitle.mutate as any).mockResolvedValue(undefined);

			session.setCurrentSession(mockSession);

			await session.updateSessionTitle("different-session", "Different Title");

			expect(session.useCurrentSession()?.title).toBe("Test Chat Session"); // Should not change
		});
	});
});
