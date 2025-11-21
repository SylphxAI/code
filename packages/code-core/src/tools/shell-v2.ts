/**
 * Shell Tools V2
 * Uses BashManagerV2 for active/background bash management
 */

import { tool } from "ai";
import { z } from "zod";
import { bashManagerV2 } from "./bash-manager-v2.js";

/**
 * Execute bash command tool (V2)
 *
 * Default behavior: Active mode with timeout
 * - Blocks if active slot occupied (queues)
 * - Auto-converts to background after timeout
 * - Real-time output via event stream
 *
 * Background mode:
 * - Spawns immediately (no queueing)
 * - Runs until completion
 * - Output via event stream
 */
export const executeBashToolV2 = tool({
	description: `Execute a bash command with active/background mode support.

Active mode (default):
- Only one active bash can run at a time
- Subsequent requests queue and wait
- Auto-converts to background after timeout
- Use for interactive commands (npm run dev, etc.)

Background mode:
- Spawns immediately without queueing
- Runs until completion
- Use for long-running builds, tests, etc.

All output is streamed in real-time via event channel "bash:{bash_id}"`,
	inputSchema: z.object({
		command: z.string().describe("Bash command to execute"),
		cwd: z.string().optional().describe("Working directory (defaults to project root)"),
		timeout: z
			.number()
			.min(1000)
			.max(600000)
			.default(120000)
			.optional()
			.describe(
				"Timeout in milliseconds for ACTIVE mode only. After timeout, bash auto-converts to background. Default: 120000 (2 minutes)",
			),
		run_in_background: z
			.boolean()
			.default(false)
			.optional()
			.describe(
				"Run in background mode (spawns immediately, no queueing). Use for long-running tasks that don't need immediate attention.",
			),
	}),
	execute: async ({ command, cwd, timeout = 120000, run_in_background = false }) => {
		try {
			const mode = run_in_background ? "background" : "active";

			// Execute via BashManagerV2
			const bashId = await bashManagerV2.execute(command, {
				mode,
				cwd,
				timeout: mode === "active" ? timeout : undefined,
			});

			// Background mode: Return immediately with bash_id
			if (mode === "background") {
				return {
					bash_id: bashId,
					command,
					mode: "background",
					message: `Running in background. Use bash-status tool to check progress.`,
				};
			}

			// Active mode: Wait for completion or demotion (blocking)
			// This is what LLM expects - execute and get output
			console.log(`[executeBashToolV2] Waiting for completion: ${bashId.slice(0, 8)}`);
			const result = await bashManagerV2.waitForCompletion(bashId);
			console.log(`[executeBashToolV2] waitForCompletion resolved: ${bashId.slice(0, 8)}, completed=${result.completed}, stdout length=${result.stdout.length}`);

			if (result.completed) {
				// Bash completed normally - return output to LLM
				console.log(`[executeBashToolV2] Returning completed result for ${bashId.slice(0, 8)}`);
				return {
					stdout: result.stdout,
					stderr: result.stderr,
					exitCode: result.exitCode,
				};
			} else {
				// Bash was demoted to background (timeout or Ctrl+B)
				console.log(`[executeBashToolV2] Returning demoted result for ${bashId.slice(0, 8)}`);
				return {
					bash_id: bashId,
					command,
					mode: "background",
					stdout: result.stdout,
					stderr: result.stderr,
					demoted: true,
					message: `Converted to background. Use bash-status tool to monitor.`,
				};
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error("[executeBashToolV2] Error:", errorMessage, error);
			throw new Error(`Failed to execute bash command: ${errorMessage}`);
		}
	},
});

/**
 * Get bash process status
 * Returns current state without output (use event subscription for output)
 */
export const getBashStatusTool = tool({
	description: "Get bash process status and metadata (not output). Use event subscription for real-time output.",
	inputSchema: z.object({
		bash_id: z.string().describe("bash_id from bash execution"),
	}),
	execute: async ({ bash_id }) => {
		const proc = bashManagerV2.get(bash_id);

		if (!proc) {
			throw new Error(`Bash process not found: ${bash_id}`);
		}

		const isActive = bashManagerV2.getActiveBashId() === bash_id;

		return {
			bash_id,
			command: proc.command,
			mode: proc.mode,
			status: proc.status,
			isActive,
			startTime: proc.startTime,
			endTime: proc.endTime,
			exitCode: proc.exitCode,
			cwd: proc.cwd,
			duration: (proc.endTime || Date.now()) - proc.startTime,
			subscription_channel: `bash:${bash_id}`,
		};
	},
});

/**
 * List all bash processes
 */
export const listBashTool = tool({
	description: "List all bash processes (active and background)",
	inputSchema: z.object({}),
	execute: async () => {
		const processes = bashManagerV2.list();
		const activeBashId = bashManagerV2.getActiveBashId();
		const queueLength = bashManagerV2.getActiveQueueLength();

		return {
			processes,
			activeBashId,
			activeQueueLength: queueLength,
			total: processes.length,
		};
	},
});

/**
 * Kill a bash process
 */
export const killBashToolV2 = tool({
	description: "Kill a bash process (active or background)",
	inputSchema: z.object({
		bash_id: z.string().describe("bash_id of process to kill"),
	}),
	execute: async ({ bash_id }) => {
		const success = bashManagerV2.kill(bash_id);

		if (!success) {
			throw new Error(`Failed to kill bash process: ${bash_id}`);
		}

		return {
			bash_id,
			status: "killed",
			message: `Sent termination signal to bash process ${bash_id}`,
		};
	},
});

/**
 * Demote active bash to background (Ctrl+B equivalent)
 */
export const demoteBashTool = tool({
	description: "Convert active bash to background (frees active slot for other commands)",
	inputSchema: z.object({
		bash_id: z.string().describe("bash_id of active bash to demote"),
	}),
	execute: async ({ bash_id }) => {
		const success = bashManagerV2.demote(bash_id);

		if (!success) {
			throw new Error(`Failed to demote bash: ${bash_id} (not active or not found)`);
		}

		return {
			bash_id,
			mode: "background",
			message: `Demoted bash ${bash_id} to background. Active slot is now free.`,
		};
	},
});

/**
 * All shell tools V2
 */
export const shellToolsV2 = {
	bash: executeBashToolV2,
	"bash-status": getBashStatusTool,
	"bash-list": listBashTool,
	"kill-bash": killBashToolV2,
	"demote-bash": demoteBashTool,
};
