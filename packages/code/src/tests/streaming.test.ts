/**
 * Streaming Integration Tests
 * Tests the complete streaming flow: tRPC subscription → events → UI updates
 */

import { createInProcessClient } from "@sylphx/code-client";
import type { AppContext } from "@sylphx/code-server";
import { closeAppContext, createAppContext, initializeAppContext } from "@sylphx/code-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("Streaming Integration", () => {
	let appContext: AppContext;
	let cleanup: (() => Promise<void>) | undefined;

	beforeAll(async () => {
		// Create app context (database, services, etc.)
		appContext = createAppContext({
			cwd: process.cwd(),
		});

		// Initialize all services
		await initializeAppContext(appContext);

		cleanup = async () => {
			await closeAppContext(appContext);
		};
	});

	afterAll(async () => {
		if (cleanup) {
			await cleanup();
		}
	});

	it("should stream a complete AI response", async () => {
		// Create tRPC client
		const client = createInProcessClient({
			appContext,
		});

		// Track events
		const events: string[] = [];
		let sessionId: string | null = null;
		let output = "";
		const errors: string[] = [];

		// NEW ARCHITECTURE: Trigger mutation + Subscribe to events
		const result = await new Promise<{
			success: boolean;
			sessionId: string | null;
			events: string[];
			output: string;
			errors: string[];
		}>(async (resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error("Test timeout after 30s"));
			}, 30000);

			try {
				// Step 1: Trigger streaming via mutation
				// Use NEW Lens flat namespace: client.triggerStream() instead of client.message.triggerStream.mutate()
				const triggerResult = await (client as any).triggerStream({
					sessionId: null,
					provider: "openrouter",
					model: "x-ai/grok-code-fast-1",
					content: [{ type: "text", content: "say hello" }],
				});

				sessionId = triggerResult.sessionId;

				if (!sessionId) {
					clearTimeout(timeout);
					errors.push("No session ID returned");
					resolve({
						success: false,
						sessionId,
						events,
						output,
						errors,
					});
					return;
				}

				// Step 2: Subscribe to session events
				// Use NEW Lens flat namespace: client.subscribeToSession() instead of client.message.subscribe.subscribe()
				(client as any).subscribeToSession({
					sessionId,
					replayLast: 50, // Replay to catch events already published
				}).subscribe({
					next: (storedEvent: any) => {
						const event = storedEvent.payload;
						events.push(event.type);

						switch (event.type) {
							case "session-created":
								// Already captured from mutation result
								break;
							case "text-delta":
								output += event.text;
								break;
							case "error":
								errors.push(event.error);
								break;
							case "complete":
								clearTimeout(timeout);
								resolve({
									success: errors.length === 0,
									sessionId,
									events,
									output,
									errors,
								});
								break;
						}
					},
					error: (error: any) => {
						clearTimeout(timeout);
						errors.push(error.message || String(error));
						resolve({
							success: false,
							sessionId,
							events,
							output,
							errors,
						});
					},
				});
			} catch (error) {
				clearTimeout(timeout);
				errors.push(error instanceof Error ? error.message : String(error));
				resolve({
					success: false,
					sessionId,
					events,
					output,
					errors,
				});
			}
		});

		// Assertions
		expect(result.success).toBe(true);
		expect(result.sessionId).toBeTruthy();
		expect(result.sessionId).toMatch(/^session-\d+$/);

		// Check event sequence
		expect(result.events).toContain("session-created");
		expect(result.events).toContain("assistant-message-created");
		expect(result.events).toContain("text-start");
		expect(result.events).toContain("text-end");
		expect(result.events).toContain("complete");

		// Check output
		expect(result.output).toBeTruthy();
		expect(result.output.length).toBeGreaterThan(0);

		// No errors
		expect(result.errors).toEqual([]);
	}, 60000); // 60s timeout for this test

	it("should handle errors gracefully", async () => {
		const client = createInProcessClient({ appContext });

		const events: string[] = [];
		const errors: string[] = [];

		const result = await new Promise<{
			success: boolean;
			events: string[];
			errors: string[];
		}>(async (resolve) => {
			const timeout = setTimeout(() => {
				resolve({
					success: false,
					events,
					errors: ["Timeout"],
				});
			}, 10000);

			try {
				// Trigger with invalid provider
				// Use NEW Lens flat namespace
				const triggerResult = await (client as any).triggerStream({
					sessionId: null,
					provider: "invalid-provider" as any,
					model: "invalid-model",
					content: [{ type: "text", content: "test" }],
				});

				const sessionId = triggerResult.sessionId;

				if (!sessionId) {
					clearTimeout(timeout);
					errors.push("No session ID returned");
					resolve({
						success: false,
						events,
						errors,
					});
					return;
				}

				// Subscribe to events
				// Use NEW Lens flat namespace
				(client as any).subscribeToSession({
					sessionId,
					replayLast: 50,
				}).subscribe({
					next: (storedEvent: any) => {
						const event = storedEvent.payload;
						events.push(event.type);
						if (event.type === "error") {
							errors.push(event.error);
						}
						if (event.type === "complete" || event.type === "error") {
							clearTimeout(timeout);
							resolve({
								success: false,
								events,
								errors,
							});
						}
					},
					error: (error: any) => {
						clearTimeout(timeout);
						errors.push(error.message || String(error));
						resolve({
							success: false,
							events,
							errors,
						});
					},
				});
			} catch (error) {
				clearTimeout(timeout);
				errors.push(error instanceof Error ? error.message : String(error));
				resolve({
					success: false,
					events,
					errors,
				});
			}
		});

		// Should have error
		expect(result.success).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
	}, 15000);

	it("should reuse existing session", async () => {
		const client = createInProcessClient({ appContext });

		// First message - creates session
		let firstSessionId: string | null = null;

		await new Promise<void>(async (resolve, reject) => {
			const timeout = setTimeout(() => reject(new Error("Timeout")), 30000);

			try {
				// Trigger first message
				// Use NEW Lens flat namespace
				const triggerResult = await (client as any).triggerStream({
					sessionId: null,
					provider: "openrouter",
					model: "x-ai/grok-code-fast-1",
					content: [{ type: "text", content: "first message" }],
				});

				firstSessionId = triggerResult.sessionId;

				if (!firstSessionId) {
					clearTimeout(timeout);
					reject(new Error("No session ID returned"));
					return;
				}

				// Subscribe to events
				// Use NEW Lens flat namespace
				(client as any).subscribeToSession({
					sessionId: firstSessionId,
					replayLast: 50,
				}).subscribe({
					next: (storedEvent: any) => {
						const event = storedEvent.payload;
						if (event.type === "complete") {
							clearTimeout(timeout);
							resolve();
						}
					},
					error: (error: any) => {
						clearTimeout(timeout);
						reject(error);
					},
				});
			} catch (error) {
				clearTimeout(timeout);
				reject(error);
			}
		});

		expect(firstSessionId).toBeTruthy();

		// Second message - reuses session
		const events: string[] = [];
		let returnedSessionId: string | null = null;

		await new Promise<void>(async (resolve, reject) => {
			const timeout = setTimeout(() => reject(new Error("Timeout")), 30000);

			try {
				// Trigger second message with existing session
				// Use NEW Lens flat namespace
				const triggerResult = await (client as any).triggerStream({
					sessionId: firstSessionId,
					content: [{ type: "text", content: "second message" }],
				});

				// Store returned session ID to verify it matches input
				returnedSessionId = triggerResult.sessionId;

				// Subscribe to events
				// Use NEW Lens flat namespace
				(client as any).subscribeToSession({
					sessionId: firstSessionId!,
					replayLast: 0, // No replay needed, session already exists
				}).subscribe({
					next: (storedEvent: any) => {
						const event = storedEvent.payload;
						events.push(event.type);
						if (event.type === "complete") {
							clearTimeout(timeout);
							resolve();
						}
					},
					error: (error: any) => {
						clearTimeout(timeout);
						reject(error);
					},
				});
			} catch (error) {
				clearTimeout(timeout);
				reject(error);
			}
		});

		// Should NOT create new session
		expect(events).not.toContain("session-created");
		// Returned session ID should match input (not a new session)
		expect(returnedSessionId).toBe(firstSessionId);
	}, 90000);
});
