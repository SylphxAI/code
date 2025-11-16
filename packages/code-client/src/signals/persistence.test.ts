/**
 * Persistence Layer Tests
 * Tests UI state persistence functionality
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as ui from "./domain/ui/index.ts";
import { clearUIPersistence, initializeUIPersistence } from "./persistence/index.ts";

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};

	return {
		getItem: vi.fn((key: string) => store[key] || null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			store = {};
		}),
		get length() {
			return Object.keys(store).length;
		},
		key: vi.fn((index: number) => Object.keys(store)[index] || null),
	};
})();

describe("Persistence Layer", () => {
	beforeEach(() => {
		// Setup localStorage mock
		Object.defineProperty(global, "localStorage", {
			value: localStorageMock,
			writable: true,
		});

		// Clear localStorage and reset UI state
		localStorageMock.clear();
		ui.navigateTo("chat");
		vi.clearAllMocks();
	});

	afterEach(() => {
		clearUIPersistence();
		vi.restoreAllMocks();
	});

	describe("UI State Persistence", () => {
		it("should initialize persistence and load saved state", () => {
			// Set up some initial saved state
			localStorageMock.setItem("sylphx:ui:last-screen", "settings");

			initializeUIPersistence();

			// Should load the saved screen if current is null/undefined
			expect(ui.useCurrentScreen()).toBe("settings");
			expect(localStorageMock.getItem).toHaveBeenCalledWith("sylphx:ui:last-screen");
		});

		it("should not override existing state with saved state", () => {
			// Set current screen to something other than default
			ui.navigateTo("provider");

			// Set up saved state with different value
			localStorageMock.setItem("sylphx:ui:last-screen", "settings");

			initializeUIPersistence();

			// Should keep current screen, not load saved one
			expect(ui.useCurrentScreen()).toBe("provider");
		});

		it("should save UI state changes to localStorage", async () => {
			initializeUIPersistence();

			// Change screen
			ui.navigateTo("settings");

			// Wait for debounced save (simulate time passing)
			await new Promise((resolve) => setTimeout(resolve, 600));

			expect(localStorageMock.setItem).toHaveBeenCalledWith("sylphx:ui:last-screen", "settings");
		});

		it("should handle localStorage unavailability gracefully", () => {
			// Remove localStorage
			delete (global as any).localStorage;

			// Should not throw error
			expect(() => {
				initializeUIPersistence();
			}).not.toThrow();
		});

		it("should handle localStorage errors gracefully", () => {
			// Make localStorage throw errors
			localStorageMock.getItem.mockImplementation(() => {
				throw new Error("Storage error");
			});

			// Should not throw error
			expect(() => {
				initializeUIPersistence();
			}).not.toThrow();
		});

		it("should debounce save operations", async () => {
			initializeUIPersistence();

			// Make rapid changes
			ui.navigateTo("settings");
			ui.navigateTo("provider");
			ui.navigateTo("help");

			// Should not save immediately
			expect(localStorageMock.setItem).not.toHaveBeenCalled();

			// Wait for debounced save
			await new Promise((resolve) => setTimeout(resolve, 600));

			// Should save only the final value
			expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
			expect(localStorageMock.setItem).toHaveBeenCalledWith("sylphx:ui:last-screen", "help");
		});

		it("should handle save errors gracefully", async () => {
			localStorageMock.setItem.mockImplementation(() => {
				throw new Error("Save failed");
			});

			initializeUIPersistence();

			// Change state
			ui.navigateTo("settings");

			// Wait for debounced save
			await new Promise((resolve) => setTimeout(resolve, 600));

			// Should not throw error, even though save failed
			expect(ui.useCurrentScreen()).toBe("settings");
		});

		it("should handle corrupted saved data gracefully", () => {
			// Set invalid data in localStorage
			localStorageMock.setItem("sylphx:ui:last-screen", "invalid-screen");

			initializeUIPersistence();

			// Should not crash or set invalid state
			expect(typeof ui.useCurrentScreen()).toBe("string");
		});

		it("should only persist specific UI state", () => {
			initializeUIPersistence();

			// Change various UI states
			ui.navigateTo("settings");
			ui.setLoading(true);
			ui.setError("Test error");

			// Wait for debounced save
			return new Promise((resolve) => setTimeout(resolve, 600)).then(() => {
				// Should only save screen, not loading/error states
				expect(localStorageMock.setItem).toHaveBeenCalledWith("sylphx:ui:last-screen", "settings");
				expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
					expect.stringContaining("loading"),
					expect.any(String),
				);
				expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
					expect.stringContaining("error"),
					expect.any(String),
				);
			});
		});
	});

	describe("Clear Persistence", () => {
		beforeEach(() => {
			initializeUIPersistence();
		});

		it("should clear all persisted UI state", async () => {
			// Save some state first
			ui.navigateTo("settings");
			await new Promise((resolve) => setTimeout(resolve, 600));

			// Clear persistence
			clearUIPersistence();

			expect(localStorageMock.removeItem).toHaveBeenCalledWith("sylphx:ui:last-screen");
		});

		it("should handle clearing when localStorage is unavailable", () => {
			delete (global as any).localStorage;

			// Should not throw error
			expect(() => {
				clearUIPersistence();
			}).not.toThrow();
		});
	});

	describe("Persistence Configuration", () => {
		it("should respect the persistence configuration", () => {
			initializeUIPersistence();

			// Check that the right key is being used
			ui.navigateTo("provider");

			return new Promise((resolve) => setTimeout(resolve, 600)).then(() => {
				expect(localStorageMock.setItem).toHaveBeenCalledWith("sylphx:ui:last-screen", "provider");
			});
		});

		it("should not persist AI configuration", () => {
			initializeUIPersistence();

			// This test verifies that AI config is not persisted
			// AI config should come from server via tRPC only

			// Make some changes that might trigger persistence
			ui.navigateTo("settings");

			return new Promise((resolve) => setTimeout(resolve, 600)).then(() => {
				// Should only persist UI state, not AI config
				const allCalls = localStorageMock.setItem.mock.calls;
				const aiConfigKeys = allCalls.filter(
					([key]) => key.includes("ai") || key.includes("config"),
				);
				expect(aiConfigKeys).toHaveLength(0);
			});
		});
	});

	describe("Integration with UI Signals", () => {
		beforeEach(() => {
			initializeUIPersistence();
		});

		it("should persist navigation changes correctly", async () => {
			// Navigate through multiple screens
			ui.navigateTo("settings");
			await new Promise((resolve) => setTimeout(resolve, 100));

			ui.navigateTo("provider");
			await new Promise((resolve) => setTimeout(resolve, 100));

			ui.navigateTo("help");
			await new Promise((resolve) => setTimeout(resolve, 600));

			// Should save final screen
			expect(localStorageMock.setItem).toHaveBeenLastCalledWith("sylphx:ui:last-screen", "help");
		});

		it("should handle rapid navigation without losing data", async () => {
			// Very rapid changes
			for (let i = 0; i < 10; i++) {
				ui.navigateTo(i % 2 === 0 ? "settings" : "provider");
			}

			// Wait for debounced save
			await new Promise((resolve) => setTimeout(resolve, 600));

			// Should have saved the final state
			expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
			expect(localStorageMock.setItem).toHaveBeenCalledWith("sylphx:ui:last-screen", "provider");
		});
	});
});
