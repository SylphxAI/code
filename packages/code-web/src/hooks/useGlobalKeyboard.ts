/**
 * Global Keyboard Hook
 * Handles global keyboard shortcuts (Ctrl+B for demoting active bash)
 */

import { useTRPC } from "@sylphx/code-client";
import { useEffect } from "preact/hooks";

export function useGlobalKeyboard() {
	const trpc = useTRPC();

	useEffect(() => {
		const handleKeyDown = async (e: KeyboardEvent) => {
			// Ctrl+B: Demote active bash to background
			if (e.ctrlKey && e.key === "b") {
				e.preventDefault();

				try {
					// Get active bash
					const active = await trpc.bash.getActive.query();

					if (!active) {
						console.log("[GlobalKeyboard] No active bash to demote");
						return;
					}

					// Demote it
					await trpc.bash.demote.mutate({ bashId: active.id });
					console.log(`[GlobalKeyboard] Demoted active bash ${active.id}`);
				} catch (error) {
					console.error("[GlobalKeyboard] Failed to demote:", error);
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [trpc]);
}
