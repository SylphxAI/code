/**
 * Hook to track background bash count
 * Polls bash list and counts non-active running processes
 */

import { useTRPCClient } from "@sylphx/code-client";
import { useEffect, useState } from "react";

export function useBackgroundBashCount(): number {
	const trpc = useTRPCClient();
	const [count, setCount] = useState(0);

	useEffect(() => {
		const updateCount = async () => {
			try {
				const processes = await trpc.bash.list.query();
				// Count background processes (not active, still running)
				const bgCount = processes.filter(
					(p: any) => !p.isActive && p.status === "running",
				).length;
				setCount(bgCount);
			} catch (error) {
				console.error("[useBackgroundBashCount] Failed to fetch:", error);
			}
		};

		// Initial load
		updateCount();

		// Poll every 2 seconds
		const interval = setInterval(updateCount, 2000);

		return () => clearInterval(interval);
	}, [trpc]);

	return count;
}
