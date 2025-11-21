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

		// Publish to individual bash channel (persisted + real-time)
		eventStream.publish(channel, event).catch((err) => {
			console.error("[BashEventBridge] Failed to publish event:", err);
		});

		// Also publish to global channel for discovery (only "started" events)
		if (event.type === "started") {
			eventStream.publish("bash:all", event).catch((err) => {
				console.error("[BashEventBridge] Failed to publish to bash:all:", err);
			});
		}
	});

	// Listen to active-queued events
	bashManagerV2.on("active-queued", (data: { bashId: string; command: string; queuePosition: number }) => {
		const channel = `bash:${data.bashId}`;

		eventStream
			.publish(channel, {
				type: "queued",
				bashId: data.bashId,
				queuePosition: data.queuePosition,
				timestamp: Date.now(),
			})
			.catch((err) => {
				console.error("[BashEventBridge] Failed to publish queued event:", err);
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
