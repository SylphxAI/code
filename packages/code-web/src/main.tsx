import { setTRPCClient } from "@sylphx/code-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { createTRPCClient, trpc } from "./trpc";
import "./index.css";
import App from "./App.tsx";

// Create wrapper component for providers
export function Root() {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						refetchOnWindowFocus: false,
						retry: false,
					},
				},
			}),
	);

	const [trpcClient] = useState(() => {
		const client = createTRPCClient();
		// Also set for code-client hooks (for potential shared usage)
		// Type assertion needed due to different tRPC client types between web and cli
		setTRPCClient(client as ReturnType<typeof createTRPCClient>);
		return client;
	});

	return (
		<StrictMode>
			<trpc.Provider client={trpcClient} queryClient={queryClient}>
				<QueryClientProvider client={queryClient}>
					<App />
				</QueryClientProvider>
			</trpc.Provider>
		</StrictMode>
	);
}

createRoot(document.getElementById("root")!).render(<Root />);
