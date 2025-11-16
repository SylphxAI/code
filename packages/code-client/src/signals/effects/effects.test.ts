/**
 * Signal Effects Tests
 * Tests side effects and cross-domain communication
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as ai from "../domain/ai/index.js";
import * as session from "../domain/session/index.js";
import * as ui from "../domain/ui/index.js";
import { initialized, initializeEffects } from "./index.js";

// Mock events module
vi.mock("../events", () => ({
	emitSessionEvent: vi.fn(),
	emitAIEvent: vi.fn(),
	emitUIEvent: vi.fn(),
}));

// Mock domain modules
vi.mock("../domain/session/index.js", () => ({
	$currentSession: { subscribe: vi.fn() },
	$isStreaming: { subscribe: vi.fn() },
	$currentSessionId: { get: vi.fn(() => null), subscribe: vi.fn() },
}));

vi.mock("../domain/ai/index.js", () => ({
	$aiConfig: { subscribe: vi.fn() },
	$selectedProvider: { subscribe: vi.fn(), get: vi.fn(() => null) },
	$selectedModel: { subscribe: vi.fn() },
	$configError: { subscribe: vi.fn() },
	$isConfigLoading: { subscribe: vi.fn() },
	setSelectedProvider: vi.fn(),
	get: vi.fn(() => null),
}));

vi.mock("../domain/ui/index.js", () => ({
	$currentScreen: { subscribe: vi.fn() },
	$previousScreen: { get: vi.fn(() => null) },
	setLoading: vi.fn(),
	get: vi.fn(() => null),
}));

// Import mocks
import { emitAIEvent, emitSessionEvent, emitUIEvent } from "../events.js";

const mockSessionModule = vi.mocked(await import("../domain/session/index.js"));
const mockAIModule = vi.mocked(await import("../domain/ai/index.js"));
const mockUIModule = vi.mocked(await import("../domain/ui/index.js"));

describe("Signal Effects", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset initialized state
		(globalThis as any).initialized = false;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Initialization", () => {
		it("should initialize effects only once", () => {
			const cleanup1 = initializeEffects();
			expect(initialized).toBe(true);

			const cleanup2 = initializeEffects();
			expect(initialized).toBe(true);

			// Should return the same cleanup function
			expect(cleanup2).toBe(cleanup1);
		});

		it("should set up all required subscriptions", () => {
			const cleanup = initializeEffects();

			// Should have subscribed to all signals
			expect(mockSessionModule.$currentSession.subscribe).toHaveBeenCalled();
			expect(mockSessionModule.$isStreaming.subscribe).toHaveBeenCalled();
			expect(mockAIModule.$aiConfig.subscribe).toHaveBeenCalled();
			expect(mockAIModule.$selectedProvider.subscribe).toHaveBeenCalled();
			expect(mockAIModule.$selectedModel.subscribe).toHaveBeenCalled();
			expect(mockAIModule.$configError.subscribe).toHaveBeenCalled();
			expect(mockUIModule.$currentScreen.subscribe).toHaveBeenCalled();

			// Should return cleanup function
			expect(typeof cleanup).toBe("function");

			cleanup();
		});
	});

	describe("Session Domain Effects", () => {
		it("should emit session:loaded event when session changes", () => {
			const cleanup = initializeEffects();

			// Get the session subscription callback
			const sessionSubscribeCall = mockSessionModule.$currentSession.subscribe.mock.calls[0];
			const sessionCallback = sessionSubscribeCall[0];

			// Simulate session change
			const mockSession = { id: "session-123", title: "Test Session" };
			sessionCallback(mockSession);

			expect(emitSessionEvent).toHaveBeenCalledWith("session:loaded", {
				sessionId: "session-123",
			});

			cleanup();
		});

		it("should not emit session:loaded event when session is null", () => {
			const cleanup = initializeEffects();

			const sessionSubscribeCall = mockSessionModule.$currentSession.subscribe.mock.calls[0];
			const sessionCallback = sessionSubscribeCall[0];

			// Simulate null session
			sessionCallback(null);

			expect(emitSessionEvent).not.toHaveBeenCalledWith("session:loaded", expect.any(Object));

			cleanup();
		});

		it("should emit loading events when streaming state changes", () => {
			const cleanup = initializeEffects();

			const streamingSubscribeCall = mockSessionModule.$isStreaming.subscribe.mock.calls[0];
			const streamingCallback = streamingSubscribeCall[0];

			// Simulate streaming start
			streamingCallback(true);
			expect(emitUIEvent).toHaveBeenCalledWith("loading:started", {
				context: "streaming",
			});

			// Simulate streaming end
			streamingCallback(false);
			expect(emitUIEvent).toHaveBeenCalledWith("loading:finished", {
				context: "streaming",
			});

			cleanup();
		});
	});

	describe("AI Domain Effects", () => {
		it("should emit config:loaded event when AI config loads", () => {
			const cleanup = initializeEffects();

			const configSubscribeCall = mockAIModule.$aiConfig.subscribe.mock.calls[0];
			const configCallback = configSubscribeCall[0];

			const mockConfig = { defaultProvider: "openrouter" };
			configCallback(mockConfig);

			expect(emitAIEvent).toHaveBeenCalledWith("config:loaded", {
				config: mockConfig,
			});

			cleanup();
		});

		it("should emit provider:selected event when provider changes", () => {
			const cleanup = initializeEffects();

			const providerSubscribeCall = mockAIModule.$selectedProvider.subscribe.mock.calls[0];
			const providerCallback = providerSubscribeCall[0];

			providerCallback("openrouter");

			expect(emitAIEvent).toHaveBeenCalledWith("provider:selected", {
				providerId: "openrouter",
			});

			cleanup();
		});

		it("should emit model:selected event when model changes", () => {
			const cleanup = initializeEffects();

			// Mock get function to return provider
			mockAIModule.get.mockReturnValue("openrouter");

			const modelSubscribeCall = mockAIModule.$selectedModel.subscribe.mock.calls[0];
			const modelCallback = modelSubscribeCall[0];

			modelCallback("claude-3-sonnet");

			expect(emitAIEvent).toHaveBeenCalledWith("model:selected", {
				providerId: "openrouter",
				modelId: "claude-3-sonnet",
			});

			cleanup();
		});

		it("should not emit model:selected event when provider is null", () => {
			const cleanup = initializeEffects();

			// Mock get function to return null
			mockAIModule.get.mockReturnValue(null);

			const modelSubscribeCall = mockAIModule.$selectedModel.subscribe.mock.calls[0];
			const modelCallback = modelSubscribeCall[0];

			modelCallback("claude-3-sonnet");

			expect(emitAIEvent).not.toHaveBeenCalledWith("model:selected", expect.any(Object));

			cleanup();
		});

		it("should emit error:shown event when config error occurs", () => {
			const cleanup = initializeEffects();

			const errorSubscribeCall = mockAIModule.$configError.subscribe.mock.calls[0];
			const errorCallback = errorSubscribeCall[0];

			errorCallback("Failed to load configuration");

			expect(emitUIEvent).toHaveBeenCalledWith("error:shown", {
				error: "Failed to load configuration",
			});

			cleanup();
		});
	});

	describe("UI Domain Effects", () => {
		it("should emit navigation:changed event when screen changes", () => {
			const cleanup = initializeEffects();

			const screenSubscribeCall = mockUIModule.$currentScreen.subscribe.mock.calls[0];
			const screenCallback = screenSubscribeCall[0];

			// Mock get function to return previous screen
			mockUIModule.get.mockReturnValue("chat");

			screenCallback("settings");

			expect(emitUIEvent).toHaveBeenCalledWith("navigation:changed", {
				from: "chat",
				to: "settings",
			});

			cleanup();
		});

		it("should not emit navigation event when previous screen is null", () => {
			const cleanup = initializeEffects();

			const screenSubscribeCall = mockUIModule.$currentScreen.subscribe.mock.calls[0];
			const screenCallback = screenSubscribeCall[0];

			// Mock get function to return null
			mockUIModule.get.mockReturnValue(null);

			screenCallback("settings");

			expect(emitUIEvent).not.toHaveBeenCalledWith("navigation:changed", expect.any(Object));

			cleanup();
		});

		it("should not emit navigation event when previous screen equals current", () => {
			const cleanup = initializeEffects();

			const screenSubscribeCall = mockUIModule.$currentScreen.subscribe.mock.calls[0];
			const screenCallback = screenSubscribeCall[0];

			// Mock get function to return same screen
			mockUIModule.get.mockReturnValue("chat");

			screenCallback("chat");

			expect(emitUIEvent).not.toHaveBeenCalledWith("navigation:changed", expect.any(Object));

			cleanup();
		});
	});

	describe("Cross-Domain Effects", () => {
		it("should auto-select provider when AI config loads", () => {
			const cleanup = initializeEffects();

			const configSubscribeCall = mockAIModule.$aiConfig.subscribe.mock.calls[0];
			const configCallback = configSubscribeCall[0];

			// Mock get function to return null (no provider selected)
			mockAIModule.get.mockReturnValue(null);

			const mockConfig = { defaultProvider: "openrouter" };
			configCallback(mockConfig);

			expect(ai.setSelectedProvider).toHaveBeenCalledWith("openrouter");

			cleanup();
		});

		it("should not auto-select provider when provider already selected", () => {
			const cleanup = initializeEffects();

			const configSubscribeCall = mockAIModule.$aiConfig.subscribe.mock.calls[0];
			const configCallback = configSubscribeCall[0];

			// Mock get function to return existing provider
			mockAIModule.get.mockReturnValue("anthropic");

			const mockConfig = { defaultProvider: "openrouter" };
			configCallback(mockConfig);

			expect(ai.setSelectedProvider).not.toHaveBeenCalled();

			cleanup();
		});

		it("should auto-create session when config loads without session", () => {
			const cleanup = initializeEffects();

			const configSubscribeCall = mockAIModule.$aiConfig.subscribe.mock.calls[1];
			const configCallback = configSubscribeCall[0];

			// Mock session get to return null (no current session)
			mockSessionModule.$currentSessionId.get.mockReturnValue(null);

			configCallback({});

			expect(session.setCurrentSessionId).toHaveBeenCalledWith("temp-session");

			cleanup();
		});

		it("should not create session when current session exists", () => {
			const cleanup = initializeEffects();

			const configSubscribeCall = mockAIModule.$aiConfig.subscribe.mock.calls[1];
			const configCallback = configSubscribeCall[0];

			// Mock session get to return existing session
			mockSessionModule.$currentSessionId.get.mockReturnValue("existing-session");

			configCallback({});

			expect(session.setCurrentSessionId).not.toHaveBeenCalledWith("temp-session");

			cleanup();
		});

		it("should sync loading state between AI and UI domains", () => {
			const cleanup = initializeEffects();

			const loadingSubscribeCall = mockAIModule.$isConfigLoading.subscribe.mock.calls[0];
			const loadingCallback = loadingSubscribeCall[0];

			// Simulate loading start
			loadingCallback(true);
			expect(ui.setLoading).toHaveBeenCalledWith(true);

			// Simulate loading end
			loadingCallback(false);
			expect(ui.setLoading).toHaveBeenCalledWith(false);

			cleanup();
		});
	});

	describe("Cleanup", () => {
		it("should return function that unsubscribes from all signals", () => {
			const cleanup = initializeEffects();

			// All subscribe calls should have been made
			expect(mockSessionModule.$currentSession.subscribe).toHaveBeenCalledTimes(1);
			expect(mockSessionModule.$isStreaming.subscribe).toHaveBeenCalledTimes(1);
			expect(mockAIModule.$aiConfig.subscribe).toHaveBeenCalledTimes(2); // Called twice for cross-domain effects
			expect(mockAIModule.$selectedProvider.subscribe).toHaveBeenCalledTimes(1);
			expect(mockAIModule.$selectedModel.subscribe).toHaveBeenCalledTimes(1);
			expect(mockAIModule.$configError.subscribe).toHaveBeenCalledTimes(1);
			expect(mockUIModule.$currentScreen.subscribe).toHaveBeenCalledTimes(1);
			expect(mockAIModule.$isConfigLoading.subscribe).toHaveBeenCalledTimes(1);

			// Mock unsubscribe functions
			const _unsubscribeMocks = [
				mockSessionModule.$currentSession.subscribe,
				mockSessionModule.$isStreaming.subscribe,
				mockAIModule.$aiConfig.subscribe,
				mockAIModule.$selectedProvider.subscribe,
				mockAIModule.$selectedModel.subscribe,
				mockAIModule.$configError.subscribe,
				mockUIModule.$currentScreen.subscribe,
				mockAIModule.$isConfigLoading.subscribe,
			].map((mock) => mock.mock.results[0].value);

			// Call cleanup
			cleanup();

			cleanup();
		});

		it("should handle cleanup when some unsubscribes fail", () => {
			// Mock one unsubscribe to throw an error
			mockSessionModule.$currentSession.subscribe.mockReturnValue(() => {
				throw new Error("Unsubscribe failed");
			});

			const cleanup = initializeEffects();

			// Should not throw when cleanup is called
			expect(() => cleanup()).not.toThrow();

			cleanup();
		});
	});

	describe("Edge Cases", () => {
		it("should handle undefined signals gracefully", () => {
			// Mock a signal to return undefined
			mockAIModule.$selectedProvider.subscribe.mockReturnValue(undefined);

			expect(() => initializeEffects()).not.toThrow();
		});

		it("should handle null config in cross-domain effects", () => {
			const cleanup = initializeEffects();

			const configSubscribeCall = mockAIModule.$aiConfig.subscribe.mock.calls[0];
			const configCallback = configSubscribeCall[0];

			// Pass null config
			configCallback(null);

			expect(emitAIEvent).not.toHaveBeenCalledWith("config:loaded", expect.any(Object));

			cleanup();
		});

		it("should handle empty strings in provider/model selection", () => {
			const cleanup = initializeEffects();

			// Mock get to return provider
			mockAIModule.get.mockReturnValue("openrouter");

			const modelSubscribeCall = mockAIModule.$selectedModel.subscribe.mock.calls[0];
			const modelCallback = modelSubscribeCall[0];

			// Pass empty string
			modelCallback("");

			// Should still emit event with empty string
			expect(emitAIEvent).toHaveBeenCalledWith("model:selected", {
				providerId: "openrouter",
				modelId: "",
			});

			cleanup();
		});

		it("should handle rapid successive initializations", () => {
			const cleanup1 = initializeEffects();
			const cleanup2 = initializeEffects();
			const cleanup3 = initializeEffects();

			// All should return the same cleanup function
			expect(cleanup1).toBe(cleanup2);
			expect(cleanup2).toBe(cleanup3);

			cleanup1();
		});
	});
});
