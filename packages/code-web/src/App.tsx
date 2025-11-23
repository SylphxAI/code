/**
 * Root App Component (Preact)
 * Sets up Lens provider and renders main UI
 *
 * MIGRATED: tRPC → Lens (2025-01-23)
 * - TRPCProvider → LensProvider (TEMP DISABLED - bundling issue)
 * - HTTP transport (port 3100 → 3000)
 * - Field-level subscriptions enabled
 *
 * TODO: Fix @sylphx/code-api bundling issue to re-enable LensProvider
 * For now: using direct signal access (signals init on import)
 */

import { useEffect, useState } from "preact/hooks";
import { ChatScreen } from "./screens/ChatScreen";
import { BashScreen } from "./screens/BashScreen";
import { Header, Sidebar, StatusBar } from "./components/layout";
import { useGlobalKeyboard } from "./hooks/useGlobalKeyboard";

// Initialize Lens HTTP client (side effect on import)
// This sets up the global client for signals to use
import "./lens-init.js";

function AppContent() {
	const [currentScreen, setCurrentScreen] = useState<"chat" | "bash">("chat");

	// Enable global keyboard shortcuts (Ctrl+B for demoting active bash)
	useGlobalKeyboard();

	return (
		<div class="app-container">
			<Header />
			<div class="app-body">
				<Sidebar />
				<main class="app-main">
					{/* Simple screen switcher (TODO: proper routing) */}
					<div class="screen-tabs border-b border-gray-700 px-4 flex gap-2">
						<button
							onClick={() => setCurrentScreen("chat")}
							class={`px-4 py-2 ${currentScreen === "chat" ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-400"}`}
						>
							Chat
						</button>
						<button
							onClick={() => setCurrentScreen("bash")}
							class={`px-4 py-2 ${currentScreen === "bash" ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-400"}`}
						>
							Bash Processes
						</button>
					</div>

					<div class="screen-content flex-1 overflow-hidden">
						{currentScreen === "chat" && <ChatScreen />}
						{currentScreen === "bash" && <BashScreen />}
					</div>
				</main>
			</div>
			<StatusBar />
		</div>
	);
}

export function App() {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		console.log("[App] Mounted with zen@3.47.0 + Preact");
	}, []);

	if (!mounted) {
		return <div>Loading...</div>;
	}

	// TODO: Re-enable LensProvider after fixing @sylphx/code-api bundling issue
	// For now: Zen signals work without provider (global state)
	return <AppContent />;
}
