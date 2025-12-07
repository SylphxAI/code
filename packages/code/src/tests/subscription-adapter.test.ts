/**
 * Subscription Adapter Unit Tests
 * Tests event handling logic without full integration
 */

import { $messages } from "@sylphx/code-client";
import type { StreamEvent } from "@sylphx/code-server";
import { get, set } from "@sylphx/zen";
import { beforeEach, describe, expect, it } from "vitest";
import { setCurrentSession, setCurrentSessionId, getCurrentSession } from "../session-state.js";

describe("Subscription Adapter", () => {
	beforeEach(() => {
		// Reset signals before each test
		setCurrentSessionId(null);
		setCurrentSession(null);
		set($messages, []);
	});

	it("should create skeleton session on session-created event", () => {
		const event: StreamEvent = {
			type: "session-created",
			sessionId: "test-session-123",
			provider: "openrouter",
			model: "test-model",
		};

		// Simulate session-created handling
		setCurrentSessionId(event.sessionId);
		setCurrentSession({
			id: event.sessionId,
			provider: event.provider,
			model: event.model,
			agentId: "coder",
			enabledRuleIds: [],
			messages: [],
			todos: [],
			nextTodoId: 1,
			created: Date.now(),
			updated: Date.now(),
		} as any);

		// Check state
		const currentSession = getCurrentSession();
		expect(currentSession).toBeTruthy();
		expect(currentSession?.id).toBe("test-session-123");
		expect(currentSession?.provider).toBe("openrouter");
		expect(currentSession?.model).toBe("test-model");
	});

	it("should add assistant message on assistant-message-created event", () => {
		// Setup: Create a session first
		setCurrentSessionId("test-session");
		const testSession = {
			id: "test-session",
			provider: "openrouter",
			model: "test-model",
			agentId: "coder",
			enabledRuleIds: [],
			messages: [] as any[],
			todos: [],
			nextTodoId: 1,
			created: Date.now(),
			updated: Date.now(),
		};
		setCurrentSession(testSession as any);

		const _event: StreamEvent = {
			type: "assistant-message-created",
			messageId: "msg-123",
		};

		// Simulate assistant-message-created handling
		const currentSession = getCurrentSession();
		if (currentSession && currentSession.id === "test-session") {
			setCurrentSession({
				...currentSession,
				messages: [
					...currentSession.messages,
					{
						role: "assistant",
						content: [],
						timestamp: Date.now(),
						status: "active",
					},
				] as any,
			} as any);
		}

		// Check state
		const updatedSession = getCurrentSession();
		expect(updatedSession?.messages).toHaveLength(1);
		expect(updatedSession?.messages[0].role).toBe("assistant");
		expect(updatedSession?.messages[0].status).toBe("active");
	});

	it("should add reasoning part on reasoning-start event", () => {
		// Setup: Session with active message
		const testSessionWithMessage = {
			id: "test-session",
			provider: "openrouter",
			model: "test-model",
			agentId: "coder",
			enabledRuleIds: [],
			messages: [
				{
					role: "assistant",
					content: [],
					timestamp: Date.now(),
					status: "active",
				},
			],
			todos: [],
			nextTodoId: 1,
			created: Date.now(),
			updated: Date.now(),
		};
		setCurrentSessionId("test-session");
		setCurrentSession(testSessionWithMessage as any);

		// Simulate reasoning-start handling
		const currentSession = getCurrentSession();
		if (currentSession) {
			const activeMessage = currentSession.messages.find((m: any) => m.status === "active");
			if (activeMessage) {
				setCurrentSession({
					...currentSession,
					messages: currentSession.messages.map((msg: any) =>
						msg.status === "active"
							? {
									...msg,
									content: [
										...msg.content,
										{
											type: "reasoning",
											content: "",
											status: "active",
											startTime: Date.now(),
										},
									],
								}
							: msg,
					),
				} as any);
			}
		}

		// Check state
		const updatedSession = getCurrentSession();
		expect(updatedSession?.messages[0].content).toHaveLength(1);
		expect(updatedSession?.messages[0].content[0].type).toBe("reasoning");
		expect(updatedSession?.messages[0].content[0].status).toBe("active");
	});

	it("should update reasoning content on reasoning-delta event", () => {
		// Setup: Session with active message and reasoning part
		const testSessionWithReasoning = {
			id: "test-session",
			provider: "openrouter",
			model: "test-model",
			agentId: "coder",
			enabledRuleIds: [],
			messages: [
				{
					role: "assistant",
					content: [
						{
							type: "reasoning",
							content: "Initial ",
							status: "active",
							startTime: Date.now(),
						},
					],
					timestamp: Date.now(),
					status: "active",
				},
			],
			todos: [],
			nextTodoId: 1,
			created: Date.now(),
			updated: Date.now(),
		};
		setCurrentSessionId("test-session");
		setCurrentSession(testSessionWithReasoning as any);

		// Simulate reasoning-delta handling
		const deltaText = "thought";

		const currentSession = getCurrentSession();
		if (currentSession) {
			const activeMessage = currentSession.messages.find((m: any) => m.status === "active");
			if (activeMessage) {
				setCurrentSession({
					...currentSession,
					messages: currentSession.messages.map((msg: any) =>
						msg.status === "active"
							? {
									...msg,
									content: msg.content.map((part: any, index: number) =>
										index === msg.content.length - 1 && part.type === "reasoning"
											? { ...part, content: part.content + deltaText }
											: part,
									),
								}
							: msg,
					),
				} as any);
			}
		}

		// Check state
		const updatedSession = getCurrentSession();
		expect(updatedSession?.messages[0].content[0].content).toBe("Initial thought");
	});

	it("should finalize reasoning on reasoning-end event", () => {
		// Setup
		const startTime = Date.now();
		const testSessionForEnd = {
			id: "test-session",
			provider: "openrouter",
			model: "test-model",
			agentId: "coder",
			enabledRuleIds: [],
			messages: [
				{
					role: "assistant",
					content: [
						{
							type: "reasoning",
							content: "Complete reasoning",
							status: "active",
							startTime,
						},
					],
					timestamp: Date.now(),
					status: "active",
				},
			],
			todos: [],
			nextTodoId: 1,
			created: Date.now(),
			updated: Date.now(),
		};
		setCurrentSessionId("test-session");
		setCurrentSession(testSessionForEnd as any);

		// Simulate reasoning-end handling
		const endTime = Date.now();

		const currentSession = getCurrentSession();
		if (currentSession) {
			const activeMessage = currentSession.messages.find((m: any) => m.status === "active");
			if (activeMessage) {
				const lastReasoningIndex = activeMessage.content
					.map((p: any, i: number) => ({ p, i }))
					.reverse()
					.find(({ p }: any) => p.type === "reasoning" && p.status === "active")?.i;

				if (lastReasoningIndex !== undefined) {
					setCurrentSession({
						...currentSession,
						messages: currentSession.messages.map((msg: any) =>
							msg.status === "active"
								? {
										...msg,
										content: msg.content.map((part: any, index: number) =>
											index === lastReasoningIndex &&
											part.type === "reasoning" &&
											part.status === "active"
												? {
														...part,
														status: "completed",
														endTime,
														duration: endTime - part.startTime,
													}
												: part,
										),
									}
								: msg,
						),
					} as any);
				}
			}
		}

		// Check state
		const updatedSession = getCurrentSession();
		const reasoning = updatedSession?.messages[0].content[0];
		expect(reasoning?.status).toBe("completed");
		expect(reasoning?.type).toBe("reasoning");
		if (reasoning?.type === "reasoning") {
			expect(reasoning.endTime).toBe(endTime);
			expect(reasoning.duration).toBeGreaterThanOrEqual(0);
		}
	});
});
