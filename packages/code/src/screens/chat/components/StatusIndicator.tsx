/**
 * StatusIndicator Component
 * Displays streaming and compacting status with spinner and contextual text
 *
 * Architecture: Backend-controlled status indicator (Pub-Sub pattern)
 * - Status text: From backend (todo in_progress > tool name > "Thinking...")
 * - Duration: Real-time tracking from backend (updated every second)
 * - Token usage: From backend via session-status-updated events
 * - Multi-client sync: All clients show same data
 */

import { useCurrentSession, useIsCompacting, useThemeColors } from "@sylphx/code-client";
import { Box, Text } from "ink";
import Spinner from "../../../components/Spinner.js";

export function StatusIndicator() {
	const isCompacting = useIsCompacting();
	const { currentSession } = useCurrentSession();
	const colors = useThemeColors();

	// Format duration display (milliseconds to seconds)
	const formatDuration = (ms: number) => {
		const seconds = Math.floor(ms / 1000);
		if (seconds < 60) {
			return `${seconds}s`;
		}
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}m ${remainingSeconds}s`;
	};

	// Format tokens display
	const formatTokens = (tokens: number) => {
		if (tokens >= 1000) {
			return `${(tokens / 1000).toFixed(1)}k`;
		}
		return String(tokens);
	};

	// Compacting takes priority over streaming
	if (isCompacting) {
		return (
			<Box paddingY={1}>
				<Spinner color={colors.warning} />
				<Text color={colors.warning}> Compacting session...</Text>
				<Text color={colors.textDim}> (ESC to cancel)</Text>
			</Box>
		);
	}

	// Check if session has active status
	const sessionStatus = currentSession?.status;
	if (!sessionStatus) {
		return (
			<Box paddingY={1}>
				<Text> </Text>
			</Box>
		);
	}

	// Determine if status is active or completed (for dimming)
	const isActive = sessionStatus.isActive;
	const spinnerColor = isActive ? colors.primary : colors.textDim;
	const textColor = isActive ? colors.primary : colors.textDim;

	return (
		<Box paddingY={1}>
			<Spinner color={spinnerColor} />
			<Text color={textColor}> {sessionStatus.text}</Text>
			<Text color={colors.textDim}> · {formatDuration(sessionStatus.duration)}</Text>
			{sessionStatus.tokenUsage > 0 && (
				<Text color={colors.textDim}> · {formatTokens(sessionStatus.tokenUsage)} tokens</Text>
			)}
			{isActive && <Text color={colors.textDim}>  (ESC to cancel)</Text>}
		</Box>
	);
}
