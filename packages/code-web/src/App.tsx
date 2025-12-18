/**
 * Sylphx Code Web App
 *
 * Main app component with routing and Lens client setup.
 * Uses HTTP transport to connect to code-server via /lens endpoint.
 */

import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { createCodeClient, httpSse, initClient } from "@sylphx/code-client";
import { ChatScreen } from "./screens/ChatScreen";
import { Layout } from "./components/Layout";

// Initialize Lens client with HTTP+SSE transport (queries via HTTP, subscriptions via SSE)
// Build absolute URL from current origin so it works regardless of which port the server is running on
const LENS_URL = import.meta.env.VITE_LENS_URL || `${window.location.origin}/lens`;

function App() {
	const [isReady, setIsReady] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		// Initialize Lens client
		try {
			const client = createCodeClient(httpSse({ url: LENS_URL }));
			initClient(client);
			setIsReady(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to initialize client");
		}
	}, []);

	if (error) {
		return (
			<div className="flex h-screen items-center justify-center bg-[var(--color-bg)]">
				<div className="text-center">
					<h1 className="text-xl font-bold text-[var(--color-error)] mb-4">
						Connection Error
					</h1>
					<p className="text-[var(--color-text-secondary)] mb-4">{error}</p>
					<p className="text-[var(--color-text-dim)] text-sm">
						Make sure the server is running: <code>code --server</code>
					</p>
				</div>
			</div>
		);
	}

	if (!isReady) {
		return (
			<div className="flex h-screen items-center justify-center bg-[var(--color-bg)]">
				<div className="text-[var(--color-text-secondary)]">Connecting...</div>
			</div>
		);
	}

	return (
		<Routes>
			<Route path="/" element={<Layout />}>
				<Route index element={<Navigate to="/chat" replace />} />
				<Route path="chat" element={<ChatScreen />} />
				<Route path="chat/:sessionId" element={<ChatScreen />} />
			</Route>
		</Routes>
	);
}

export default App;
