/**
 * Root App Component (Preact)
 * Sets up tRPC provider and renders main UI
 */

import { TRPCProvider, createHTTPClient } from "@sylphx/code-client";
import { useEffect, useState } from "preact/hooks";
import { ChatScreen } from "./screens/ChatScreen";

// ASSUMPTION: HTTP client connecting to local server
// For web UI, we use HTTP transport instead of in-process
const trpcClient = createHTTPClient("http://localhost:3100");

export function App() {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		console.log("[App] Mounted with zen@3.47.0 + Preact");
	}, []);

	if (!mounted) {
		return <div>Loading...</div>;
	}

	return (
		<TRPCProvider client={trpcClient}>
			{/* @ts-expect-error - TRPCProvider uses React ReactNode but Preact VNode is compatible */}
			<div class="app-container">
				<header class="app-header">
					<h1>SYLPHX CODE</h1>
					<p>AI Development Assistant</p>
				</header>
				<main class="app-main">
					<ChatScreen />
				</main>
			</div>
		</TRPCProvider>
	);
}
