/**
 * Bash Event Service
 * Bridges BashManagerV2 events to AppEventStream for multi-client sync
 *
 * Architecture:
 * - Listens to bash:event from BashManagerV2
 * - Publishes to channel "bash:{bashId}"
 * - Stores in database for restorable streaming
 * - Clients subscribe via trpc.events.subscribe({ channel: "bash:xxx" })
 */
import type { AppContext } from "../context.js";
/**
 * Initialize bash event bridge
 * Call this once on server startup
 */
export declare function initializeBashEventBridge(appContext: AppContext): void;
/**
 * Bash event types for client consumption
 */
export type BashEvent = {
    type: "started";
    bashId: string;
    mode: "active" | "background";
    status: string;
    timestamp: number;
} | {
    type: "output";
    bashId: string;
    output: {
        type: "stdout" | "stderr";
        data: string;
        timestamp: number;
    };
    timestamp: number;
} | {
    type: "completed" | "failed" | "killed";
    bashId: string;
    status: string;
    exitCode?: number | null;
    timestamp: number;
} | {
    type: "mode-changed" | "promoted";
    bashId: string;
    mode: "active" | "background";
    timestamp: number;
} | {
    type: "timeout";
    bashId: string;
    mode: "background";
    status: string;
    timestamp: number;
} | {
    type: "queued";
    bashId: string;
    queuePosition: number;
    timestamp: number;
};
//# sourceMappingURL=bash-event.service.d.ts.map