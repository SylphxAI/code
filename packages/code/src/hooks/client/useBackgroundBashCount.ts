/**
 * Hook to track background bash count
 * Event-driven: subscribes to bash:all channel for updates
 * State stored in Zen signals for global access
 */

import {
	useTRPCClient,
	useBackgroundBashCount as useBackgroundBashCountSignal,
	setBackgroundBashCount as setBackgroundBashCountSignal,
} from "@sylphx/code-client";
import { useEffect, useRef } from "react";

export function useBackgroundBashCount(): number {
	const trpc = useTRPCClient();
	const count = useBackgroundBashCountSignal();
	const subscriptionRef = useRef<any>(null);

	useEffect(() => {
		const updateCount = async () => {
			try {
				const processes = await trpc.bash.list.query();
				// Count background processes (not active, still running)
				const bgCount = processes.filter(
					(p: any) => !p.isActive && p.status === "running",
				).length;
				setBackgroundBashCountSignal(bgCount);
			} catch (error) {
				console.error("[useBackgroundBashCount] Failed to fetch:", error);
			}
		};

		// Initial load
		updateCount();

		// Subscribe to bash:all for event-driven updates
		try {
			subscriptionRef.current = trpc.events.subscribe.subscribe(
				{ channel: "bash:all", fromCursor: undefined },
				{
					onData: (event: any) => {
						const eventType = event.payload?.type;
						// Update count on events that affect background bash count
						if (["started", "completed", "failed", "killed", "demoted", "promoted"].includes(eventType)) {
							updateCount();
						}
					},
					onError: (err: any) => {
						console.error("[useBackgroundBashCount] Subscription error:", err);
					},
				},
			);
		} catch (error) {
			console.error("[useBackgroundBashCount] Failed to subscribe:", error);
		}

		return () => {
			if (subscriptionRef.current) {
				subscriptionRef.current.unsubscribe();
			}
		};
	}, [trpc]);

	return count;
}
