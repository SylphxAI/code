/**
 * Main App Component
 * Root React + Ink component with screen routing
 */

import { useAIConfigActions } from "./hooks/client/useAIConfig.js";
import { useSessionPersistence } from "./hooks/client/useSessionPersistence.js";
import { setError, setCurrentScreen, useCurrentScreen, useIsLoading, useUIError, useTRPCClient } from "@sylphx/code-client";
import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";
import { getColors } from "./utils/theme/index.js";
import Chat from "./screens/Chat.js";
import CommandPalette from "./screens/CommandPalette.js";
import Logs from "./screens/Logs.js";
import ModelSelection from "./screens/ModelSelection.js";
import ProviderManagement from "./screens/ProviderManagement.js";
import BashList from "./screens/BashList.js";
import BashDetail from "./screens/BashDetail.js";

function AppContent() {
	const currentScreen = useCurrentScreen();
	const isLoading = useIsLoading();
	const error = useUIError();
	const trpc = useTRPCClient();
	const [commandPaletteCommand, setCommandPaletteCommand] = useState<string | null>(null);
	const [selectedBashId, setSelectedBashId] = useState<string | null>(null);

	// Load AI config on mount
	const { loadConfig } = useAIConfigActions();

	// Load sessions from database (auto-migrates from files if needed)
	useSessionPersistence();

	// Global keyboard shortcuts (only active when not in text input screens)
	const shouldHandleGlobalKeys = !["chat", "command-palette"].includes(currentScreen);

	useInput(
		(input, key) => {
			// Ctrl+B: Demote active bash to background
			if (key.ctrl && input === "b") {
				trpc.bash.getActive
					.query()
					.then((active) => {
						if (active) {
							return trpc.bash.demote.mutate({ bashId: active.id });
						}
					})
					.catch((error) => {
						console.error("[App] Failed to demote active bash:", error);
					});
				return;
			}

			// Ctrl+P: Open bash list
			if (key.ctrl && input === "p") {
				setCurrentScreen("bash-list");
				return;
			}
		},
		{ isActive: shouldHandleGlobalKeys },
	);

	// Handle command palette commands
	const handleCommand = (command: string) => {
		setCommandPaletteCommand(command);
	};

	// Load AI config via tRPC (server handles all file operations)
	useEffect(() => {
		// Load AI config from server only - no client persistence
		loadConfig().catch((_err) => {
			// Error loading config is expected if server isn't ready
		});
	}, [loadConfig]);

	// Clear error after 5 seconds
	useEffect(() => {
		if (error) {
			const timeout = setTimeout(() => {
				setError(null);
			}, 5000);
			return () => clearTimeout(timeout);
		}
	}, [error]);

	// Full-screen screens - no app layout padding
	// These screens manage their own layout to handle Static/Dynamic boundary correctly
	if (currentScreen === "chat") {
		return <Chat commandFromPalette={commandPaletteCommand} />;
	}

	// Bash screens (full-screen)
	if (currentScreen === "bash-list") {
		return (
			<BashList
				onClose={() => setCurrentScreen("chat")}
				onSelectBash={(bashId) => {
					setSelectedBashId(bashId);
					setCurrentScreen("bash-detail");
				}}
			/>
		);
	}

	if (currentScreen === "bash-detail" && selectedBashId) {
		return (
			<BashDetail
				bashId={selectedBashId}
				onClose={() => {
					setSelectedBashId(null);
					setCurrentScreen("bash-list");
				}}
			/>
		);
	}

	const colors = getColors();

	// Other screens use app layout with padding
	return (
		<Box flexDirection="column" width="100%" height="100%" paddingX={1}>
			{/* Header */}
			<Box paddingY={1}>
				<Text bold color={colors.primary}>SYLPHX CODE</Text>
			</Box>

			{/* Error Display */}
			{error && (
				<Box paddingY={1}>
					<Text color={colors.error}>▌</Text>
					<Text color={colors.error} bold>
						{" "}
						ERROR{" "}
					</Text>
					<Text color={colors.textDim}>{error}</Text>
				</Box>
			)}

			{/* Loading Indicator */}
			{isLoading && (
				<Box paddingY={1}>
					<Text color={colors.warning}>▌</Text>
					<Text color={colors.warning} bold>
						{" "}
						LOADING
					</Text>
					<Text color={colors.textDim}>...</Text>
				</Box>
			)}

			{/* Screen Router */}
			<Box flexDirection="column" flexGrow={1} minHeight={0}>
				{currentScreen === "provider-management" && <ProviderManagement />}
				{currentScreen === "model-selection" && <ModelSelection />}
				{currentScreen === "command-palette" && <CommandPalette onCommand={handleCommand} />}
				{currentScreen === "logs" && <Logs />}
			</Box>
		</Box>
	);
}

export default function App() {
	return <AppContent />;
}
