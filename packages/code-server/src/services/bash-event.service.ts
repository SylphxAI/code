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
import type { BashStateChange } from "@sylphx/code-core";

/**
 * Initialize bash event bridge
 * Call this once on server startup
 */
export function initializeBashEventBridge(appContext: AppContext): void {
	const { bashManagerV2, eventStream } = appContext;

	// Listen to all bash events
	bashManagerV2.on("bash:event", (event: BashStateChange) => {
		const channel = `bash:${event.bashId}`;

		// Publish to event stream (persisted + real-time)
		eventStream.emit(channel, event.type, event);
	});

	// Listen to active-queued events
	bashManagerV2.on("active-queued", (data: { bashId: string; command: string; queuePosition: number }) => {
		const channel = `bash:${data.bashId}`;

		eventStream.emit(channel, "queued", {
			bashId: data.bashId,
			type: "queued",
			queuePosition: data.queuePosition,
			timestamp: Date.now(),
		});
	});
}

/**
 * Bash event types for client consumption
 */
export type BashEvent =
	| {
			type: "started";
			bashId: string;
			mode: "active" | "background";
			status: string;
			timestamp: number;
	  }
	| {
			type: "output";
			bashId: string;
			output: {
				type: "stdout" | "stderr";
				data: string;
				timestamp: number;
			};
			timestamp: number;
	  }
	| {
			type: "completed" | "failed" | "killed";
			bashId: string;
			status: string;
			exitCode?: number | null;
			timestamp: number;
	  }
	| {
			type: "mode-changed" | "promoted";
			bashId: string;
			mode: "active" | "background";
			timestamp: number;
	  }
	| {
			type: "timeout";
			bashId: string;
			mode: "background";
			status: string;
			timestamp: number;
	  }
	| {
			type: "queued";
			bashId: string;
			queuePosition: number;
			timestamp: number;
	  };
