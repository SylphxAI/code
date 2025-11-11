/**
 * UI Domain Signals Tests
 * Tests UI state management and navigation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as ui from "./index.js";

describe("UI Domain Signals", () => {
	beforeEach(() => {
		// Reset all signals to initial state
		ui.navigateTo("chat");
		ui.setLoading(false);
		ui.setError(null);
		ui.clearDebugLogs();
	});

	afterEach(() => {
		// Clean up state
		vi.clearAllMocks();
	});

	describe("Core UI Signals", () => {
		it("should initialize with default values", () => {
			expect(ui.useCurrentScreen()).toBe("chat");
			expect(ui.usePreviousScreen()).toBe(null);
			expect(ui.useIsLoading()).toBe(false);
			expect(ui.useUIError()).toBe(null);
			expect(ui.useDebugLogs()).toEqual([]);
		});

		it("should update loading state correctly", () => {
			ui.setLoading(true);
			expect(ui.useIsLoading()).toBe(true);

			ui.setLoading(false);
			expect(ui.useIsLoading()).toBe(false);
		});

		it("should update error state correctly", () => {
			const error = "Network error occurred";
			ui.setError(error);

			expect(ui.useUIError()).toBe(error);

			ui.setError(null);
			expect(ui.useUIError()).toBe(null);
		});
	});

	describe("Navigation", () => {
		it("should navigate to different screens", () => {
			ui.navigateTo("settings");
			expect(ui.useCurrentScreen()).toBe("settings");
			expect(ui.usePreviousScreen()).toBe("chat");

			ui.navigateTo("provider");
			expect(ui.useCurrentScreen()).toBe("provider");
			expect(ui.usePreviousScreen()).toBe("settings");
		});

		it("should go back to previous screen", () => {
			ui.navigateTo("settings");
			ui.navigateTo("provider");

			ui.goBack();
			expect(ui.useCurrentScreen()).toBe("settings");
			expect(ui.usePreviousScreen()).toBe("provider");
		});

		it("should handle goBack when no previous screen", () => {
			ui.goBack(); // Should not change anything
			expect(ui.useCurrentScreen()).toBe("chat");
			expect(ui.usePreviousScreen()).toBe(null);
		});

		it("should not navigate to same screen", () => {
			ui.navigateTo("chat");
			expect(ui.useCurrentScreen()).toBe("chat");
			expect(ui.usePreviousScreen()).toBe(null); // Should remain null
		});
	});

	describe("Computed Signals", () => {
		it("should compute canGoBack correctly", () => {
			expect(ui.useCanGoBack()).toBe(false);

			ui.navigateTo("settings");
			expect(ui.useCanGoBack()).toBe(true);

			ui.navigateTo("provider");
			expect(ui.useCanGoBack()).toBe(true);

			ui.goBack(); // Go back to settings
			expect(ui.useCanGoBack()).toBe(true);

			ui.goBack(); // Go back to chat
			expect(ui.useCanGoBack()).toBe(false);
		});

		it("should compute showNavigation correctly", () => {
			expect(ui.useShowNavigation()).toBe(true); // chat screen

			ui.navigateTo("settings");
			expect(ui.useShowNavigation()).toBe(true);

			ui.navigateTo("provider");
			expect(ui.useShowNavigation()).toBe(false);

			ui.navigateTo("help");
			expect(ui.useShowNavigation()).toBe(false);
		});
	});

	describe("Debug Logs", () => {
		beforeEach(() => {
			// Mock DEBUG environment variable
			vi.stubEnv("DEBUG", "true");
		});

		afterEach(() => {
			vi.unstubAllEnvs();
		});

		it("should add debug logs when DEBUG is enabled", () => {
			ui.addDebugLog("Test message 1");
			ui.addDebugLog("Test message 2");

			const logs = ui.useDebugLogs();
			expect(logs).toHaveLength(2);
			expect(logs[1]).toContain("Test message 2");
			expect(logs[1]).toContain("["); // Should have timestamp
		});

		it("should not add debug logs when DEBUG is disabled", () => {
			vi.stubEnv("DEBUG", "false");

			ui.addDebugLog("This should not be logged");

			expect(ui.useDebugLogs()).toEqual([]);
		});

		it("should limit debug logs to prevent memory issues", () => {
			// Add many logs to test the limit
			for (let i = 0; i < 1500; i++) {
				ui.addDebugLog(`Log message ${i}`);
			}

			const logs = ui.useDebugLogs();
			expect(logs.length).toBeLessThanOrEqual(1000);
			expect(logs.length).toBeGreaterThan(0);
		});

		it("should clear debug logs", () => {
			ui.addDebugLog("Test message");
			ui.addDebugLog("Another message");

			expect(ui.useDebugLogs()).toHaveLength(2);

			ui.clearDebugLogs();
			expect(ui.useDebugLogs()).toEqual([]);
		});
	});

	describe("Edge Cases", () => {
		it("should handle multiple rapid navigation changes", () => {
			ui.navigateTo("settings");
			ui.navigateTo("provider");
			ui.navigateTo("help");
			ui.goBack();
			ui.navigateTo("provider");

			expect(ui.useCurrentScreen()).toBe("provider");
			expect(ui.usePreviousScreen()).toBe("help");
		});

		it("should handle consecutive error states", () => {
			ui.setError("First error");
			ui.setError("Second error");
			ui.setError(null);

			expect(ui.useUIError()).toBe(null);
		});

		it("should handle loading state changes during navigation", () => {
			ui.setLoading(true);
			ui.navigateTo("settings");
			ui.setLoading(false);

			expect(ui.useCurrentScreen()).toBe("settings");
			expect(ui.useIsLoading()).toBe(false);
		});
	});

	describe("Integration with Computed Signals", () => {
		it("should update computed signals when dependencies change", () => {
			// Initial state
			expect(ui.useCanGoBack()).toBe(false);
			expect(ui.useShowNavigation()).toBe(true);

			// Navigate away from chat
			ui.navigateTo("provider");
			expect(ui.useCanGoBack()).toBe(true);
			expect(ui.useShowNavigation()).toBe(false);

			// Go back to chat
			ui.goBack();
			expect(ui.useCanGoBack()).toBe(false);
			expect(ui.useShowNavigation()).toBe(true);
		});

		it("should handle navigation history correctly", () => {
			ui.navigateTo("settings");
			ui.navigateTo("provider");
			ui.navigateTo("help");

			expect(ui.useCurrentScreen()).toBe("help");
			expect(ui.usePreviousScreen()).toBe("provider");

			ui.goBack();
			expect(ui.useCurrentScreen()).toBe("provider");
			expect(ui.usePreviousScreen()).toBe("help");

			ui.goBack();
			expect(ui.useCurrentScreen()).toBe("settings");
			expect(ui.usePreviousScreen()).toBe("provider");
		});
	});
});
