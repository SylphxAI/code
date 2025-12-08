/**
 * StatusIndicator Component
 * Displays streaming and compacting status with spinner and contextual text
 *
 * Architecture: Client-side State via Event Stream
 * - Uses useSessionStatus() which is updated via event stream callbacks
 * - Server pushes session-updated events during streaming
 * - Client receives events and updates local state
 * - Duration is tracked locally for smooth 100ms updates
 *
 * NOTE: We don't use Lens live query for status because:
 * - React re-renders cause rapid subscribe/unsubscribe cycles
 * - The async emit pattern races with cleanup
 * - Client-side state via event stream is more reliable
 */

import { useIsCompacting, useSessionStatus } from "../../../ui-state.js";
import { Box, Text } from "ink";
import { useEffect, useState } from "react";
import Spinner from "../../../components/Spinner.js";
import { useThemeColors } from "../../../theme.js";

export function StatusIndicator() {
	const isCompacting = useIsCompacting();
	const sessionStatus = useSessionStatus();
	const colors = useThemeColors();

	// Local duration tracking for smooth updates
	const [localDuration, setLocalDuration] = useState(0);

	// Update local duration every 100ms when status is active
	useEffect(() => {
		if (!sessionStatus?.isActive) {
			setLocalDuration(0);
			return;
		}

		// Start local timer
		const startTime = Date.now();
		const interval = setInterval(() => {
			setLocalDuration(Date.now() - startTime + (sessionStatus.duration || 0));
		}, 100); // Update every 100ms for smooth display

		return () => clearInterval(interval);
	}, [sessionStatus?.isActive, sessionStatus?.duration]);

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

	// Use local duration if backend duration is 0 (optimistic update)
	// Otherwise use backend duration (more accurate, includes network latency)
	const displayDuration = sessionStatus.duration > 0 ? sessionStatus.duration : localDuration;

	return (
		<Box paddingY={1}>
			<Spinner color={spinnerColor} />
			<Text color={textColor}> {sessionStatus.text}</Text>
			<Text color={colors.textDim}> · {formatDuration(displayDuration)}</Text>
			{sessionStatus.tokenUsage > 0 && (
				<Text color={colors.textDim}> · {formatTokens(sessionStatus.tokenUsage)} tokens</Text>
			)}
			{isActive && <Text color={colors.textDim}>  (ESC to cancel)</Text>}
		</Box>
	);
}
