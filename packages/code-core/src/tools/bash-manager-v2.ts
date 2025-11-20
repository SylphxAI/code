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
			// Check if active slot available
			if (this.activeBashId !== null) {
				// Queue and wait for slot
				return new Promise((resolve, reject) => {
					this.activeQueue.push({ id: bashId, command, cwd, timeout, resolve, reject });
					this.emit("active-queued", { bashId, command, queuePosition: this.activeQueue.length });
				});
			}

			// Active slot available - spawn immediately
			this.activeBashId = bashId;
			this._spawn(bashId, command, { mode: "active", cwd, timeout });
			return bashId;
		}

		// Background mode - spawn immediately
		this._spawn(bashId, command, { mode: "background", cwd, timeout: null });
		return bashId;
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
		};

		this.processes.set(bashId, proc);

		// Emit started event
		this.emit("bash:event", {
			bashId,
			type: "started",
			mode,
			status: "running",
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
			const chunk: BashOutputChunk = {
				bashId,
				type: "stdout",
				data: data.toString(),
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
			const chunk: BashOutputChunk = {
				bashId,
				type: "stderr",
				data: data.toString(),
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
		const proc = this.processes.get(bashId);
		if (!proc || proc.mode !== "active") return false;
		if (this.activeBashId !== bashId) return false;

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

		this.emit("bash:event", {
			bashId,
			type: "mode-changed",
			mode: "background",
			timestamp: Date.now(),
		} as BashStateChange);

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
