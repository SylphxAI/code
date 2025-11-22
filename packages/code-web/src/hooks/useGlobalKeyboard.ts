/**
 * Global Keyboard Hook
 * Handles global keyboard shortcuts (Ctrl+B for demoting active bash)
 *
 * Note: Migrated to Lens client for fine-grained frontend-driven architecture
 */

import { lensClient } from "@sylphx/code-client";
import { useEffect } from "preact/hooks";

export function useGlobalKeyboard() {
	useEffect(() => {
		const handleKeyDown = async (e: KeyboardEvent) => {
			// Ctrl+B: Demote active bash to background
			if (e.ctrlKey && e.key === "b") {
				e.preventDefault();

				try {
					// Get active bash
					const active = await lensClient.bash.getActive.query();

					if (!active) {
						console.log("[GlobalKeyboard] No active bash to demote");
						return;
					}

					// Demote it
					await lensClient.bash.demote.mutate({ bashId: active.id });
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
	}, []);
}
