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
import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
/**
 * Enhanced Bash Manager
 * Singleton instance managing all bash processes
 */
export class BashManagerV2 extends EventEmitter {
    processes = new Map();
    activeBashId = null;
    activeQueue = [];
    executionLock = Promise.resolve();
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
    async execute(command, options) {
        const { mode, cwd = process.cwd(), timeout = 120000 } = options;
        const bashId = randomUUID();
        if (mode === "active") {
            // Use lock to prevent race condition when checking/setting activeBashId
            return this._executeWithLock(async () => {
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
            });
        }
        // Background mode - spawn immediately
        this._spawn(bashId, command, { mode: "background", cwd, timeout: null });
        return bashId;
    }
    /**
     * Execute function with lock to prevent race conditions
     */
    async _executeWithLock(fn) {
        // Wait for previous operation to complete
        const previousLock = this.executionLock;
        // Create new lock promise
        let resolveLock;
        this.executionLock = new Promise((resolve) => {
            resolveLock = resolve;
        });
        try {
            // Wait for previous lock to release
            await previousLock;
            // Execute function
            return await fn();
        }
        finally {
            // Release lock
            resolveLock();
        }
    }
    /**
     * Internal spawn logic
     */
    _spawn(bashId, command, options) {
        const { mode, cwd, timeout } = options;
        const bashProcess = spawn("bash", ["-c", command], {
            cwd,
            shell: false,
        });
        const proc = {
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
        });
        // Setup timeout for active mode
        if (mode === "active" && timeout) {
            proc.timeoutHandle = setTimeout(() => {
                this._handleTimeout(bashId);
            }, timeout);
        }
        // Stream stdout
        bashProcess.stdout?.on("data", (data) => {
            const dataStr = data.toString();
            proc.stdout += dataStr;
            const chunk = {
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
            });
        });
        // Stream stderr
        bashProcess.stderr?.on("data", (data) => {
            const dataStr = data.toString();
            proc.stderr += dataStr;
            const chunk = {
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
            });
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
    _handleTimeout(bashId) {
        const proc = this.processes.get(bashId);
        if (!proc || proc.mode !== "active")
            return;
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
        });
    }
    /**
     * Handle process exit
     */
    _handleExit(bashId, code) {
        const proc = this.processes.get(bashId);
        if (!proc)
            return;
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
        });
    }
    /**
     * Handle process error
     */
    _handleError(bashId, error) {
        const proc = this.processes.get(bashId);
        if (!proc)
            return;
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
        });
    }
    /**
     * Process active queue - spawn next waiting bash
     */
    _processActiveQueue() {
        if (this.activeQueue.length === 0)
            return;
        if (this.activeBashId !== null)
            return; // Slot still occupied
        const next = this.activeQueue.shift();
        this.activeBashId = next.id;
        this._spawn(next.id, next.command, { mode: "active", cwd: next.cwd, timeout: next.timeout });
        next.resolve(next.id);
    }
    /**
     * Demote active bash → background (Ctrl+B)
     */
    demote(bashId) {
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
        });
        console.log(`[BashManagerV2] demote: Event emitted, returning true`);
        return true;
    }
    /**
     * Promote background bash → active (waits for slot)
     */
    async promote(bashId) {
        const proc = this.processes.get(bashId);
        if (!proc || proc.mode !== "background")
            return false;
        if (proc.status !== "running")
            return false; // Can't promote completed bash
        // Wait for active slot
        if (this.activeBashId !== null) {
            return new Promise((resolve) => {
                const checkSlot = () => {
                    if (this.activeBashId === null) {
                        this._doPromote(bashId);
                        resolve(true);
                    }
                    else {
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
    _doPromote(bashId) {
        const proc = this.processes.get(bashId);
        if (!proc)
            return;
        proc.mode = "active";
        this.activeBashId = bashId;
        this.emit("bash:event", {
            bashId,
            type: "promoted",
            mode: "active",
            timestamp: Date.now(),
        });
    }
    /**
     * Kill bash process
     */
    kill(bashId) {
        const proc = this.processes.get(bashId);
        if (!proc || !proc.process)
            return false;
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
        });
        return true;
    }
    /**
     * Wait for bash process to complete or be demoted (for active mode)
     * Returns result with output and status
     */
    async waitForCompletion(bashId) {
        console.log(`[BashManagerV2] waitForCompletion: Setting up listener for ${bashId.slice(0, 8)}`);
        return new Promise((resolve) => {
            const handler = (event) => {
                if (event.bashId !== bashId)
                    return;
                console.log(`[BashManagerV2] waitForCompletion: Received event ${event.type} for ${bashId.slice(0, 8)}`);
                const proc = this.processes.get(bashId);
                if (!proc)
                    return;
                // Check for completion events
                if (event.type === "completed" ||
                    event.type === "failed" ||
                    event.type === "killed") {
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
    get(bashId) {
        const proc = this.processes.get(bashId);
        return proc || null;
    }
    /**
     * List all bashes
     */
    list() {
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
    getActiveBashId() {
        return this.activeBashId;
    }
    /**
     * Get active queue length
     */
    getActiveQueueLength() {
        return this.activeQueue.length;
    }
    /**
     * Cleanup old completed processes (>1 hour)
     */
    cleanup() {
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
setInterval(() => {
    bashManagerV2.cleanup();
}, 10 * 60 * 1000);
//# sourceMappingURL=bash-manager-v2.js.map