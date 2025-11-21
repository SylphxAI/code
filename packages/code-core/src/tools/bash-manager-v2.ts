/**
 * Enhanced Bash Process Manager (V2)
 * Supports active/background bash model with multi-client streaming
 *
 * Features:
 * - 1 active bash (blocks subsequent active requests)
 * - Multiple background bashes
 * - Auto-timeout → background conversion
 * - Ctrl+B manual demotion
 * - Real-time output streaming via events
 * - Queue for pending active bash requests
 */

import { randomUUID } from "node:crypto";
import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";

export type BashMode = "active" | "background";
export type BashStatus = "running" | "completed" | "failed" | "killed" | "timeout";

export interface BashProcess {
	id: string;
	command: string;
	mode: BashMode;
	status: BashStatus;
	process: ChildProcess | null;
	startTime: number;
	endTime: number | null;
	exitCode: number | null;
	cwd: string;
	timeout: number | null; // For active mode only
	timeoutHandle: NodeJS.Timeout | null;
	stdout: string; // Buffer for stdout
	stderr: string; // Buffer for stderr
}

export interface BashOutputChunk {
	bashId: string;
	type: "stdout" | "stderr";
	data: string;
	timestamp: number;
}

export interface BashStateChange {
	bashId: string;
	type: "started" | "output" | "completed" | "failed" | "killed" | "mode-changed" | "promoted" | "timeout";
	mode?: BashMode;
	status?: BashStatus;
	exitCode?: number | null;
	output?: BashOutputChunk;
	command?: string;
	cwd?: string;
	timestamp: number;
}

/**
 * Enhanced Bash Manager
 * Singleton instance managing all bash processes
 */
export class BashManagerV2 extends EventEmitter {
	private processes = new Map<string, BashProcess>();
	private activeBashId: string | null = null;
	private activeQueue: Array<{
		id: string;
		command: string;
		cwd: string;
		timeout: number;
		resolve: (bashId: string) => void;
		reject: (error: Error) => void;
	}> = [];
	private executionLock: Promise<void> = Promise.resolve();

	constructor() {
		super();
		this.setMaxListeners(1000); // Support many subscriptions
	}

	/**
	 * Execute bash command
	 * - If mode=active and no active slot: queue and wait
	 * - If mode=background: spawn immediately
	 * - Auto-timeout converts active → background
	 */
	async execute(
		command: string,
		options: {
			mode: BashMode;
			cwd?: string;
			timeout?: number; // Only for active mode
		},
	): Promise<string> {
		const { mode, cwd = process.cwd(), timeout = 120000 } = options;
		const bashId = randomUUID();

		if (mode === "active") {
			// Use lock to prevent race condition when checking/setting activeBashId
			return this._executeWithLock(async () => {
				// Check if active slot available
				if (this.activeBashId !== null) {
					// Queue and wait for slot
					return new Promise<string>((resolve, reject) => {
						this.activeQueue.push({ id: bashId, command, cwd, timeout, resolve, reject });
						this.emit("active-queued", { bashId, command, queuePosition: this.activeQueue.length });
					});
				}

				// Active slot available - spawn immediately
				this.activeBashId = bashId;
				this._spawn(bashId, command, { mode: "active", cwd, timeout });
				return bashId;
			});
		}

		// Background mode - spawn immediately
		this._spawn(bashId, command, { mode: "background", cwd, timeout: null });
		return bashId;
	}

	/**
	 * Execute function with lock to prevent race conditions
	 */
	private async _executeWithLock<T>(fn: () => Promise<T>): Promise<T> {
		// Wait for previous operation to complete
		const previousLock = this.executionLock;

		// Create new lock promise
		let resolveLock: () => void;
		this.executionLock = new Promise((resolve) => {
			resolveLock = resolve;
		});

		try {
			// Wait for previous lock to release
			await previousLock;
			// Execute function
			return await fn();
		} finally {
			// Release lock
			resolveLock!();
		}
	}

	/**
	 * Internal spawn logic
	 */
	private _spawn(
		bashId: string,
		command: string,
		options: { mode: BashMode; cwd: string; timeout: number | null },
	): void {
		const { mode, cwd, timeout } = options;

		const bashProcess = spawn("bash", ["-c", command], {
			cwd,
			shell: false,
		});

		const proc: BashProcess = {
			id: bashId,
			command,
			mode,
			status: "running",
			process: bashProcess,
			startTime: Date.now(),
			endTime: null,
			exitCode: null,
			cwd,
			timeout,
			timeoutHandle: null,
			stdout: "",
			stderr: "",
		};

		this.processes.set(bashId, proc);

		// Emit started event with command and cwd for client matching
		this.emit("bash:event", {
			bashId,
			type: "started",
			mode,
			status: "running",
			command: proc.command,
			cwd: proc.cwd,
			timestamp: Date.now(),
		} as BashStateChange);

		// Setup timeout for active mode
		if (mode === "active" && timeout) {
			proc.timeoutHandle = setTimeout(() => {
				this._handleTimeout(bashId);
			}, timeout);
		}

		// Stream stdout
		bashProcess.stdout?.on("data", (data: Buffer) => {
			const dataStr = data.toString();
			proc.stdout += dataStr;

			const chunk: BashOutputChunk = {
				bashId,
				type: "stdout",
				data: dataStr,
				timestamp: Date.now(),
			};

			this.emit("bash:event", {
				bashId,
				type: "output",
				output: chunk,
				timestamp: Date.now(),
			} as BashStateChange);
		});

		// Stream stderr
		bashProcess.stderr?.on("data", (data: Buffer) => {
			const dataStr = data.toString();
			proc.stderr += dataStr;

			const chunk: BashOutputChunk = {
				bashId,
				type: "stderr",
				data: dataStr,
				timestamp: Date.now(),
			};

			this.emit("bash:event", {
				bashId,
				type: "output",
				output: chunk,
				timestamp: Date.now(),
			} as BashStateChange);
		});

		// Handle exit
		bashProcess.on("exit", (code) => {
			this._handleExit(bashId, code);
		});

		// Handle error
		bashProcess.on("error", (error) => {
			this._handleError(bashId, error);
		});
	}

	/**
	 * Handle timeout - convert active → background
	 */
	private _handleTimeout(bashId: string): void {
		const proc = this.processes.get(bashId);
		if (!proc || proc.mode !== "active") return;

		// Convert to background
		proc.mode = "background";
		proc.status = "timeout";
		proc.timeout = null;
		proc.timeoutHandle = null;

		// Release active slot
		if (this.activeBashId === bashId) {
			this.activeBashId = null;
			this._processActiveQueue();
		}

		this.emit("bash:event", {
			bashId,
			type: "timeout",
			mode: "background",
			status: "timeout",
			timestamp: Date.now(),
		} as BashStateChange);
	}

	/**
	 * Handle process exit
	 */
	private _handleExit(bashId: string, code: number | null): void {
		const proc = this.processes.get(bashId);
		if (!proc) return;

		proc.exitCode = code;
		proc.endTime = Date.now();
		proc.status = code === 0 ? "completed" : "failed";
		proc.process = null;

		// Clear timeout if exists
		if (proc.timeoutHandle) {
			clearTimeout(proc.timeoutHandle);
			proc.timeoutHandle = null;
		}

		// Release active slot if this was active
		if (this.activeBashId === bashId) {
			this.activeBashId = null;
			this._processActiveQueue();
		}

		this.emit("bash:event", {
			bashId,
			type: code === 0 ? "completed" : "failed",
			status: proc.status,
			exitCode: code,
			timestamp: Date.now(),
		} as BashStateChange);
	}

	/**
	 * Handle process error
	 */
	private _handleError(bashId: string, error: Error): void {
		const proc = this.processes.get(bashId);
		if (!proc) return;

		proc.status = "failed";
		proc.endTime = Date.now();
		proc.process = null;

		// Clear timeout if exists
		if (proc.timeoutHandle) {
			clearTimeout(proc.timeoutHandle);
			proc.timeoutHandle = null;
		}

		// Release active slot if this was active
		if (this.activeBashId === bashId) {
			this.activeBashId = null;
			this._processActiveQueue();
		}

		this.emit("bash:event", {
			bashId,
			type: "failed",
			status: "failed",
			timestamp: Date.now(),
		} as BashStateChange);
	}

	/**
	 * Process active queue - spawn next waiting bash
	 */
	private _processActiveQueue(): void {
		if (this.activeQueue.length === 0) return;
		if (this.activeBashId !== null) return; // Slot still occupied

		const next = this.activeQueue.shift()!;
		this.activeBashId = next.id;
		this._spawn(next.id, next.command, { mode: "active", cwd: next.cwd, timeout: next.timeout });
		next.resolve(next.id);
	}

	/**
	 * Demote active bash → background (Ctrl+B)
	 */
	demote(bashId: string): boolean {
		console.log(`[BashManagerV2] demote: Called for ${bashId.slice(0, 8)}`);
		const proc = this.processes.get(bashId);
		if (!proc || proc.mode !== "active") {
			console.log(`[BashManagerV2] demote: Failed - proc not found or not active`);
			return false;
		}
		if (this.activeBashId !== bashId) {
			console.log(`[BashManagerV2] demote: Failed - not the active bash`);
			return false;
		}

		console.log(`[BashManagerV2] demote: Converting to background, stdout length: ${proc.stdout.length}`);

		// Convert to background
		proc.mode = "background";

		// Clear timeout
		if (proc.timeoutHandle) {
			clearTimeout(proc.timeoutHandle);
			proc.timeoutHandle = null;
			proc.timeout = null;
		}

		// Release active slot
		this.activeBashId = null;
		this._processActiveQueue();

		console.log(`[BashManagerV2] demote: Emitting mode-changed event`);
		this.emit("bash:event", {
			bashId,
			type: "mode-changed",
			mode: "background",
			timestamp: Date.now(),
		} as BashStateChange);
		console.log(`[BashManagerV2] demote: Event emitted, returning true`);

		return true;
	}

	/**
	 * Promote background bash → active (waits for slot)
	 */
	async promote(bashId: string): Promise<boolean> {
		const proc = this.processes.get(bashId);
		if (!proc || proc.mode !== "background") return false;
		if (proc.status !== "running") return false; // Can't promote completed bash

		// Wait for active slot
		if (this.activeBashId !== null) {
			return new Promise((resolve) => {
				const checkSlot = () => {
					if (this.activeBashId === null) {
						this._doPromote(bashId);
						resolve(true);
					} else {
						setTimeout(checkSlot, 100); // Poll every 100ms
					}
				};
				checkSlot();
			});
		}

		// Slot available
		this._doPromote(bashId);
		return true;
	}

	/**
	 * Internal promote logic
	 */
	private _doPromote(bashId: string): void {
		const proc = this.processes.get(bashId);
		if (!proc) return;

		proc.mode = "active";
		this.activeBashId = bashId;

		this.emit("bash:event", {
			bashId,
			type: "promoted",
			mode: "active",
			timestamp: Date.now(),
		} as BashStateChange);
	}

	/**
	 * Kill bash process
	 */
	kill(bashId: string): boolean {
		const proc = this.processes.get(bashId);
		if (!proc || !proc.process) return false;

		proc.status = "killed";
		proc.process.kill("SIGTERM");

		// Force kill after 5s
		setTimeout(() => {
			if (proc.process && proc.exitCode === null) {
				proc.process.kill("SIGKILL");
			}
		}, 5000);

		// Clear timeout if exists
		if (proc.timeoutHandle) {
			clearTimeout(proc.timeoutHandle);
			proc.timeoutHandle = null;
		}

		// Release active slot if this was active
		if (this.activeBashId === bashId) {
			this.activeBashId = null;
			this._processActiveQueue();
		}

		this.emit("bash:event", {
			bashId,
			type: "killed",
			status: "killed",
			timestamp: Date.now(),
		} as BashStateChange);

		return true;
	}

	/**
	 * Wait for bash process to complete or be demoted (for active mode)
	 * Returns result with output and status
	 */
	async waitForCompletion(
		bashId: string,
	): Promise<{
		completed: boolean; // true if finished, false if demoted/timeout
		status: BashStatus;
		exitCode: number | null;
		stdout: string;
		stderr: string;
		mode: BashMode;
	}> {
		console.log(`[BashManagerV2] waitForCompletion: Setting up listener for ${bashId.slice(0, 8)}`);
		return new Promise((resolve) => {
			const handler = (event: BashStateChange) => {
				if (event.bashId !== bashId) return;

				console.log(`[BashManagerV2] waitForCompletion: Received event ${event.type} for ${bashId.slice(0, 8)}`);

				const proc = this.processes.get(bashId);
				if (!proc) return;

				// Check for completion events
				if (
					event.type === "completed" ||
					event.type === "failed" ||
					event.type === "killed"
				) {
					console.log(`[BashManagerV2] waitForCompletion: Resolving with completed=true for ${bashId.slice(0, 8)}`);
					this.off("bash:event", handler);
					resolve({
						completed: true,
						status: proc.status,
						exitCode: proc.exitCode,
						stdout: proc.stdout,
						stderr: proc.stderr,
						mode: proc.mode,
					});
				}
				// Check for demotion events (timeout or manual Ctrl+B)
				else if (event.type === "timeout" || event.type === "mode-changed") {
					console.log(`[BashManagerV2] waitForCompletion: Resolving with completed=false (demoted) for ${bashId.slice(0, 8)}, stdout length: ${proc.stdout.length}`);
					this.off("bash:event", handler);
					resolve({
						completed: false,
						status: proc.status,
						exitCode: null,
						stdout: proc.stdout,
						stderr: proc.stderr,
						mode: "background",
					});
				}
			};

			this.on("bash:event", handler);
			console.log(`[BashManagerV2] waitForCompletion: Listener registered for ${bashId.slice(0, 8)}`);
		});
	}

	/**
	 * Get bash info
	 */
	get(bashId: string): BashProcess | null {
		const proc = this.processes.get(bashId);
		return proc || null;
	}

	/**
	 * List all bashes
	 */
	list(): Array<{
		id: string;
		command: string;
		mode: BashMode;
		status: BashStatus;
		isActive: boolean;
		duration: number;
		exitCode: number | null;
		cwd: string;
	}> {
		return Array.from(this.processes.values()).map((proc) => ({
			id: proc.id,
			command: proc.command,
			mode: proc.mode,
			status: proc.status,
			isActive: this.activeBashId === proc.id,
			duration: (proc.endTime || Date.now()) - proc.startTime,
			exitCode: proc.exitCode,
			cwd: proc.cwd,
		}));
	}

	/**
	 * Get active bash ID
	 */
	getActiveBashId(): string | null {
		return this.activeBashId;
	}

	/**
	 * Get active queue length
	 */
	getActiveQueueLength(): number {
		return this.activeQueue.length;
	}

	/**
	 * Cleanup old completed processes (>1 hour)
	 */
	cleanup(): void {
		const oneHourAgo = Date.now() - 60 * 60 * 1000;

		for (const [id, proc] of this.processes.entries()) {
			if (proc.status !== "running" && proc.startTime < oneHourAgo) {
				this.processes.delete(id);
			}
		}
	}
}

// Singleton instance
export const bashManagerV2 = new BashManagerV2();

// Auto-cleanup every 10 minutes
setInterval(
	() => {
		bashManagerV2.cleanup();
	},
	10 * 60 * 1000,
);
