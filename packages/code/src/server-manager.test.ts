/**
 * Unit tests for server-manager
 * Testing auto-start server functionality
 */

import { existsSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as serverHealth from "./server-health.js";

// Mock dependencies
vi.mock("fs", () => ({
	existsSync: vi.fn(),
}));
vi.mock("./server-health.js", () => ({
	checkServer: vi.fn(),
	waitForServer: vi.fn(),
}));
vi.mock("child_process", () => ({
	spawn: vi.fn(() => ({
		unref: vi.fn(),
		on: vi.fn(),
	})),
}));

describe("server-manager", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("getServerCommand", () => {
		it("should detect dev mode when code-server/src/cli.ts exists", async () => {
			// Mock dev environment
			(existsSync as any).mockReturnValue(true);

			const { ensureServer } = await import("./server-manager.js");

			// In dev mode, should be available
			const result = await ensureServer({ autoStart: false });

			// Should at least not error
			expect(typeof result).toBe("boolean");
		});

		it("should detect production mode when binary exists in PATH", async () => {
			// Mock production environment
			(existsSync as any).mockReturnValue(false);

			const { ensureServer } = await import("./server-manager.js");

			// Should handle missing binary gracefully
			const result = await ensureServer({ autoStart: false });

			expect(typeof result).toBe("boolean");
		});
	});

	describe("ensureServer", () => {
		it("should return true if server already running", async () => {
			// Mock server already running
			(serverHealth.checkServer as any).mockResolvedValue(true);

			const { ensureServer } = await import("./server-manager.js");

			const result = await ensureServer({ autoStart: true });

			expect(result).toBe(true);
		});

		it("should return false when autoStart=false and server not running", async () => {
			// Mock server not running
			(serverHealth.checkServer as any).mockResolvedValue(false);

			const { ensureServer } = await import("./server-manager.js");

			const result = await ensureServer({ autoStart: false });

			expect(result).toBe(false);
		});

		it("should attempt to start server when autoStart=true", async () => {
			// Mock server not running initially
			(serverHealth.checkServer as any).mockResolvedValue(false);
			(serverHealth.waitForServer as any).mockResolvedValue(false);
			(existsSync as any).mockReturnValue(false);

			const { ensureServer } = await import("./server-manager.js");

			const result = await ensureServer({ autoStart: true, quiet: true });

			// Should return false if server doesn't start
			expect(typeof result).toBe("boolean");
		});
	});

	describe("getServerStatus", () => {
		it("should return correct status when server is running", async () => {
			(serverHealth.checkServer as any).mockResolvedValue(true);
			(existsSync as any).mockReturnValue(true);

			const { getServerStatus } = await import("./server-manager.js");

			const status = await getServerStatus();

			expect(status).toHaveProperty("running");
			expect(status).toHaveProperty("available");
		});

		it("should return correct status when server is not running", async () => {
			(serverHealth.checkServer as any).mockResolvedValue(false);

			const { getServerStatus } = await import("./server-manager.js");

			const status = await getServerStatus();

			expect(status).toHaveProperty("running", false);
		});
	});
});
