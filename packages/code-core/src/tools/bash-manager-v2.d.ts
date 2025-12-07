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
import type { ChildProcess } from "node:child_process";
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
    timeout: number | null;
    timeoutHandle: NodeJS.Timeout | null;
    stdout: string;
    stderr: string;
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
export declare class BashManagerV2 extends EventEmitter {
    private processes;
    private activeBashId;
    private activeQueue;
    private executionLock;
    constructor();
    /**
     * Execute bash command
     * - If mode=active and no active slot: queue and wait
     * - If mode=background: spawn immediately
     * - Auto-timeout converts active → background
     */
    execute(command: string, options: {
        mode: BashMode;
        cwd?: string;
        timeout?: number;
    }): Promise<string>;
    /**
     * Execute function with lock to prevent race conditions
     */
    private _executeWithLock;
    /**
     * Internal spawn logic
     */
    private _spawn;
    /**
     * Handle timeout - convert active → background
     */
    private _handleTimeout;
    /**
     * Handle process exit
     */
    private _handleExit;
    /**
     * Handle process error
     */
    private _handleError;
    /**
     * Process active queue - spawn next waiting bash
     */
    private _processActiveQueue;
    /**
     * Demote active bash → background (Ctrl+B)
     */
    demote(bashId: string): boolean;
    /**
     * Promote background bash → active (waits for slot)
     */
    promote(bashId: string): Promise<boolean>;
    /**
     * Internal promote logic
     */
    private _doPromote;
    /**
     * Kill bash process
     */
    kill(bashId: string): boolean;
    /**
     * Wait for bash process to complete or be demoted (for active mode)
     * Returns result with output and status
     */
    waitForCompletion(bashId: string): Promise<{
        completed: boolean;
        status: BashStatus;
        exitCode: number | null;
        stdout: string;
        stderr: string;
        mode: BashMode;
    }>;
    /**
     * Get bash info
     */
    get(bashId: string): BashProcess | null;
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
    }>;
    /**
     * Get active bash ID
     */
    getActiveBashId(): string | null;
    /**
     * Get active queue length
     */
    getActiveQueueLength(): number;
    /**
     * Cleanup old completed processes (>1 hour)
     */
    cleanup(): void;
}
export declare const bashManagerV2: BashManagerV2;
//# sourceMappingURL=bash-manager-v2.d.ts.map