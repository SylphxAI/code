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
import { useEffect, useRef } from "react";

export function useBackgroundBashCount(): number {
	const client = useLensClient();
	const count = useBackgroundBashCountSignal();
	const subscriptionRef = useRef<any>(null);

	useEffect(() => {
		const updateCount = async () => {
			try {
				// Lens flat namespace: client.listBash.fetch({})
				const processes = await client.listBash.fetch({}) as Array<{ isActive?: boolean; status?: string }>;
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

		return () => {
			if (subscriptionRef.current) {
				subscriptionRef.current.unsubscribe();
			}
		};
	}, [client]);

	return count;
}
