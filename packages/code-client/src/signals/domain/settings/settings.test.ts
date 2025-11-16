/**
 * Settings Domain Signals Tests
 * Tests user settings management (agent selection, enabled rules)
 */

import type { AIConfig } from "@sylphx/code-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as ai from "../ai/index.js";
import * as session from "../session/index.js";
import * as settings from "./index.js";

// Mock dependencies
vi.mock("../../../trpc-provider.js", () => ({
	getTRPCClient: vi.fn(() => ({
		config: {
			save: {
				mutate: vi.fn(),
			},
			updateRules: {
				mutate: vi.fn(),
			},
		},
	})),
}));

vi.mock("../../../lib/event-bus.js", () => ({
	eventBus: {
		on: vi.fn(),
		emit: vi.fn(),
	},
}));

// Mock AI config
const mockAIConfig: AIConfig = {
	defaultProvider: "openrouter",
	defaultAgentId: "coder",
	defaultEnabledRuleIds: ["core"],
	providers: {
		openrouter: {
			defaultModel: "claude-3-sonnet",
			apiKey: "test-key",
		},
	},
};

describe("Settings Domain Signals", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset all signals to initial state
		ai.setAIConfig(mockAIConfig);
		session.setCurrentSessionId(null);

		// Reset settings signals
		settings.$selectedAgentId.set("coder");
		settings.$enabledRuleIds.set([]);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Core Settings Signals", () => {
		it("should initialize with default values", () => {
			expect(settings.useSelectedAgentId()).toBe("coder");
			expect(settings.useEnabledRuleIds()).toEqual([]);
		});

		it("should update selected agent ID", async () => {
			const { getTRPCClient } = await import("../../../trpc-provider.js");
			const mockClient = getTRPCClient();

			(mockClient.config.save.mutate as any).mockResolvedValue(undefined);

			await settings.setSelectedAgent("writer");

			expect(settings.useSelectedAgentId()).toBe("writer");
			expect(mockClient.config.save.mutate).toHaveBeenCalledWith({
				config: {
					...mockAIConfig,
					defaultAgentId: "writer",
				},
			});
		});

		it("should update AI config when agent changes", async () => {
			const { getTRPCClient } = await import("../../../trpc-provider.js");
			const mockClient = getTRPCClient();

			(mockClient.config.save.mutate as any).mockResolvedValue(undefined);

			await settings.setSelectedAgent("debugger");

			// AI config should be updated with new agent ID
			expect(ai.useAIConfig()?.defaultAgentId).toBe("debugger");
		});

		it("should handle agent selection without AI config", async () => {
			ai.setAIConfig(null);

			await settings.setSelectedAgent("writer");

			// Should update local state but not call tRPC
			expect(settings.useSelectedAgentId()).toBe("writer");

			const { getTRPCClient } = await import("../../../trpc-provider.js");
			const mockClient = getTRPCClient();
			expect(mockClient.config.save.mutate).not.toHaveBeenCalled();
		});

		it("should set enabled rule IDs", async () => {
			const { getTRPCClient } = await import("../../../trpc-provider.js");
			const mockClient = getTRPCClient();

			(mockClient.config.updateRules.mutate as any).mockResolvedValue(undefined);

			const ruleIds = ["core", "debug", "security"];
			await settings.setEnabledRuleIds(ruleIds);

			expect(settings.useEnabledRuleIds()).toEqual(ruleIds);
			expect(mockClient.config.updateRules.mutate).toHaveBeenCalledWith({
				ruleIds,
				sessionId: undefined,
			});
		});

		it("should set enabled rule IDs with session ID", async () => {
			const { getTRPCClient } = await import("../../../trpc-provider.js");
			const mockClient = getTRPCClient();

			(mockClient.config.updateRules.mutate as any).mockResolvedValue(undefined);

			const ruleIds = ["core", "debug"];
			await settings.setEnabledRuleIds(ruleIds, "session-123");

			expect(settings.useEnabledRuleIds()).toEqual(ruleIds);
			expect(mockClient.config.updateRules.mutate).toHaveBeenCalledWith({
				ruleIds,
				sessionId: "session-123",
			});
		});
	});

	describe("Event Integration", () => {
		it("should set up event listeners on module load", async () => {
			const { eventBus } = await import("../../../lib/event-bus.js");

			// Should have called eventBus.on for various events
			expect(eventBus.on).toHaveBeenCalledWith("session:changed", expect.any(Function));
			expect(eventBus.on).toHaveBeenCalledWith("session:created", expect.any(Function));
			expect(eventBus.on).toHaveBeenCalledWith("session:loaded", expect.any(Function));
			expect(eventBus.on).toHaveBeenCalledWith("session:rulesUpdated", expect.any(Function));
		});

		it("should clear enabled rules when session changes to null", async () => {
			settings.$enabledRuleIds.set(["core", "debug"]);

			// Simulate session:changed event
			const { eventBus } = await import("../../../lib/event-bus.js");
			const eventListeners = (eventBus.on as any).mock.calls;

			// Find the session:changed listener
			const sessionChangedListener = eventListeners.find(
				([event]) => event === "session:changed",
			)[1];

			// Call the listener with null sessionId
			sessionChangedListener({ sessionId: null });

			expect(settings.useEnabledRuleIds()).toEqual([]);
		});

		it("should update enabled rules on session:created event", async () => {
			const { eventBus } = await import("../../../lib/event-bus.js");
			const eventListeners = (eventBus.on as any).mock.calls;

			// Find the session:created listener
			const sessionCreatedListener = eventListeners.find(
				([event]) => event === "session:created",
			)[1];

			// Call the listener with enabled rules
			const enabledRuleIds = ["core", "debug", "security"];
			sessionCreatedListener({ enabledRuleIds });

			expect(settings.useEnabledRuleIds()).toEqual(enabledRuleIds);
		});

		it("should update enabled rules on session:loaded event", async () => {
			const { eventBus } = await import("../../../lib/event-bus.js");
			const eventListeners = (eventBus.on as any).mock.calls;

			// Find the session:loaded listener
			const sessionLoadedListener = eventListeners.find(([event]) => event === "session:loaded")[1];

			// Call the listener with enabled rules
			const enabledRuleIds = ["debug"];
			sessionLoadedListener({ enabledRuleIds });

			expect(settings.useEnabledRuleIds()).toEqual(["debug"]);
		});

		it("should update enabled rules on session:rulesUpdated event", async () => {
			const { eventBus } = await import("../../../lib/event-bus.js");
			const eventListeners = (eventBus.on as any).mock.calls;

			// Find the session:rulesUpdated listener
			const rulesUpdatedListener = eventListeners.find(
				([event]) => event === "session:rulesUpdated",
			)[1];

			// Call the listener with enabled rules
			const enabledRuleIds = ["core", "security"];
			rulesUpdatedListener({ enabledRuleIds, sessionId: "session-123" });

			expect(settings.useEnabledRuleIds()).toEqual(["core", "security"]);
		});
	});

	describe("Optimistic Updates", () => {
		it("should update local state immediately when setting agent", async () => {
			const { getTRPCClient } = await import("../../../trpc-provider.js");
			const mockClient = getTRPCClient();

			// Mock slow server response
			(mockClient.config.save.mutate as any).mockImplementation(
				() => new Promise((resolve) => setTimeout(resolve, 1000)),
			);

			const promise = settings.setSelectedAgent("designer");

			// State should be updated immediately, not wait for server
			expect(settings.useSelectedAgentId()).toBe("designer");

			// Wait for server call to complete
			await promise;
		});

		it("should update local state immediately when setting rules", async () => {
			const { getTRPCClient } = await import("../../../trpc-provider.js");
			const mockClient = getTRPCClient();

			// Mock slow server response
			(mockClient.config.updateRules.mutate as any).mockImplementation(
				() => new Promise((resolve) => setTimeout(resolve, 1000)),
			);

			const ruleIds = ["core", "debug"];
			const promise = settings.setEnabledRuleIds(ruleIds);

			// State should be updated immediately, not wait for server
			expect(settings.useEnabledRuleIds()).toEqual(ruleIds);

			// Wait for server call to complete
			await promise;
		});
	});

	describe("Error Handling", () => {
		it("should handle tRPC errors when setting agent", async () => {
			const { getTRPCClient } = await import("../../../trpc-provider.js");
			const mockClient = getTRPCClient();

			(mockClient.config.save.mutate as any).mockRejectedValue(new Error("Server error"));

			// Should not throw error, but state may not be persisted
			await expect(settings.setSelectedAgent("writer")).rejects.toThrow("Server error");

			// Local state might still be updated (optimistic update)
			expect(settings.useSelectedAgentId()).toBe("writer");
		});

		it("should handle tRPC errors when setting rules", async () => {
			const { getTRPCClient } = await import("../../../trpc-provider.js");
			const mockClient = getTRPCClient();

			(mockClient.config.updateRules.mutate as any).mockRejectedValue(new Error("Server error"));

			const ruleIds = ["core"];

			// Should not throw error, but state may not be persisted
			await expect(settings.setEnabledRuleIds(ruleIds)).rejects.toThrow("Server error");

			// Local state might still be updated (optimistic update)
			expect(settings.useEnabledRuleIds()).toEqual(ruleIds);
		});
	});

	describe("Integration with AI Config", () => {
		it("should use AI config for agent persistence", async () => {
			const { getTRPCClient } = await import("../../../trpc-provider.js");
			const mockClient = getTRPCClient();

			(mockClient.config.save.mutate as any).mockResolvedValue(undefined);

			const configWithAgent = {
				...mockAIConfig,
				defaultAgentId: "debugger",
			};
			ai.setAIConfig(configWithAgent);

			await settings.setSelectedAgent("designer");

			// Should include existing agent ID in the config
			expect(mockClient.config.save.mutate).toHaveBeenCalledWith({
				config: {
					...configWithAgent,
					defaultAgentId: "designer",
				},
			});
		});

		it("should not call tRPC when AI config is null", async () => {
			ai.setAIConfig(null);

			const { getTRPCClient } = await import("../../../trpc-provider.js");
			const mockClient = getTRPCClient();

			await settings.setSelectedAgent("writer");

			expect(mockClient.config.save.mutate).not.toHaveBeenCalled();
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty rule IDs array", async () => {
			const { getTRPCClient } = await import("../../../trpc-provider.js");
			const mockClient = getTRPCClient();

			(mockClient.config.updateRules.mutate as any).mockResolvedValue(undefined);

			await settings.setEnabledRuleIds([]);

			expect(settings.useEnabledRuleIds()).toEqual([]);
			expect(mockClient.config.updateRules.mutate).toHaveBeenCalledWith({
				ruleIds: [],
				sessionId: undefined,
			});
		});

		it("should handle duplicate rule IDs", async () => {
			const { getTRPCClient } = await import("../../../trpc-provider.js");
			const mockClient = getTRPCClient();

			(mockClient.config.updateRules.mutate as any).mockResolvedValue(undefined);

			const ruleIds = ["core", "core", "debug"]; // duplicates
			await settings.setEnabledRuleIds(ruleIds);

			expect(settings.useEnabledRuleIds()).toEqual(["core", "core", "debug"]);
			expect(mockClient.config.updateRules.mutate).toHaveBeenCalledWith({
				ruleIds: ["core", "core", "debug"],
				sessionId: undefined,
			});
		});

		it("should handle very long agent ID", async () => {
			const { getTRPCClient } = await import("../../../trpc-provider.js");
			const mockClient = getTRPCClient();

			(mockClient.config.save.mutate as any).mockResolvedValue(undefined);

			const longAgentId = "a".repeat(1000);
			await settings.setSelectedAgent(longAgentId);

			expect(settings.useSelectedAgentId()).toBe(longAgentId);
			expect(mockClient.config.save.mutate).toHaveBeenCalledWith({
				config: {
					...mockAIConfig,
					defaultAgentId: longAgentId,
				},
			});
		});

		it("should handle null sessionId in rule update", async () => {
			const { getTRPCClient } = await import("../../../trpc-provider.js");
			const mockClient = getTRPCClient();

			(mockClient.config.updateRules.mutate as any).mockResolvedValue(undefined);

			await settings.setEnabledRuleIds(["core"], null);

			expect(mockClient.config.updateRules.mutate).toHaveBeenCalledWith({
				ruleIds: ["core"],
				sessionId: undefined,
			});
		});
	});
});
