/**
 * Unit tests for trpc-client
 * Testing tRPC client creation and server health checks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("trpc-client", () => {
	let originalFetch: typeof global.fetch;

	beforeEach(() => {
		vi.clearAllMocks();
		originalFetch = global.fetch;
	});

	afterEach(() => {
		global.fetch = originalFetch;
	});

	describe("createHTTPClient", () => {
		it("should create tRPC client with correct configuration", async () => {
			const { createHTTPClient } = await import("./trpc-client.js");

			const client = createHTTPClient();

			// Proxy client should be defined
			expect(client).toBeDefined();
		});
	});

	describe("checkServer", () => {
		it("should handle server connectivity checks", async () => {
			const { checkServer } = await import("./trpc-client.js");

			// Mock fetch to simulate server unavailable
			global.fetch = vi.fn().mockRejectedValue(new Error("Server not available"));

			const result = await checkServer("http://localhost:9999");
			expect(typeof result).toBe("boolean");
			expect(result).toBe(false);
		});

		it("should return true when server is available", async () => {
			const { checkServer } = await import("./trpc-client.js");

			// Mock fetch to simulate server available
			global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);

			const result = await checkServer("http://localhost:3000");
			expect(typeof result).toBe("boolean");
			expect(result).toBe(true);
		});
	});

	describe("waitForServer", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("should timeout when server is not available", async () => {
			const { waitForServer } = await import("./trpc-client.js");

			// Mock fetch to simulate server unavailable
			global.fetch = vi.fn().mockRejectedValue(new Error("Server not available"));

			// Use real timers for this test, but with a short timeout
			const startTime = Date.now();
			const result = await waitForServer("http://localhost:9999", 100);
			const endTime = Date.now();

			expect(result).toBe(false);
			// Should take at least 100ms (our timeout)
			expect(endTime - startTime).toBeGreaterThanOrEqual(100);
		});

		it("should return true when server is available", async () => {
			const { waitForServer } = await import("./trpc-client.js");

			// Mock fetch to simulate server available
			global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);

			const result = await waitForServer("http://localhost:3000", 100);
			expect(result).toBe(true);
		});
	});
});
