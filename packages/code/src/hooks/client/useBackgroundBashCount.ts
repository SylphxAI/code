/**
 * Hook to track background bash count
 * Event-driven: subscribes to bash:all channel for updates
 * State stored in Zen signals for global access
 */

import {
	useLensClient,
	useBackgroundBashCount as useBackgroundBashCountSignal,
	setBackgroundBashCount as setBackgroundBashCountSignal,
} from "@sylphx/code-client";
import type { API } from "@sylphx/code-api";
import { useEffect, useRef } from "react";

export function useBackgroundBashCount(): number {
	const client = useLensClient<API>();
	const count = useBackgroundBashCountSignal();
	const subscriptionRef = useRef<any>(null);

	useEffect(() => {
		const updateCount = async () => {
			try {
				const processes = await client.bash.list.query({});
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

		// Subscribe to bash:all for event-driven updates using Lens
		try {
			subscriptionRef.current = client.events.subscribe.subscribe(
				{ channel: "bash:all" },
				{
					next: (event: any) => {
						const eventType = event.payload?.type;
						// Update count on events that affect background bash count
						if (["started", "completed", "failed", "killed", "demoted", "promoted"].includes(eventType)) {
							updateCount();
						}
					},
					error: (err: any) => {
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
	}, [client]);

	return count;
}
