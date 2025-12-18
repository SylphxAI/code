/**
 * StatusIndicator Component
 * Displays streaming and compacting status with spinner and contextual text
 *
 * Architecture: Lens Live Query (v2.4.0+)
 * - Receives sessionStatus from parent via props (single subscription in parent)
 * - Status field uses .subscribe() resolver on server
 * - Lens auto-routes to streaming transport when status is selected
 * - Server emits status updates via ctx.emit()
 * - Client receives live updates through the query
 * - Duration is tracked locally for smooth 100ms updates between server updates
 */

import { useIsCompacting } from "../../../ui-state.js";
import { Box, Text } from "ink";
import { useEffect, useState } from "react";
import Spinner from "../../../components/Spinner.js";
import { useThemeColors } from "../../../theme.js";
import type { SessionStatus } from "../../../session-state.js";

interface StatusIndicatorProps {
	/** Session status from parent */
	sessionStatus?: SessionStatus;
}

export function StatusIndicator({ sessionStatus }: StatusIndicatorProps) {
	const isCompacting = useIsCompacting();
	const colors = useThemeColors();

	// Local duration tracking for smooth updates
	// Server sends startTime, client calculates duration locally
	const [localDuration, setLocalDuration] = useState(0);

	// Update local duration every 100ms when status is active
	useEffect(() => {
		if (!sessionStatus?.isActive || !sessionStatus?.startTime) {
			setLocalDuration(0);
			return;
		}

		// Calculate duration from server-provided startTime
		const interval = setInterval(() => {
			setLocalDuration(Date.now() - sessionStatus.startTime);
		}, 100); // Update every 100ms for smooth display

		// Set initial duration immediately
		setLocalDuration(Date.now() - sessionStatus.startTime);

		return () => clearInterval(interval);
	}, [sessionStatus?.isActive, sessionStatus?.startTime]);

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

	// Only show status indicator when actively streaming
	// When complete (isActive: false), hide the indicator entirely
	if (!sessionStatus || !sessionStatus.isActive) {
		return (
			<Box paddingY={1}>
				<Text> </Text>
			</Box>
		);
	}

	// Duration is always calculated locally from server-provided startTime
	const displayDuration = localDuration;

	return (
		<Box paddingY={1}>
			<Spinner color={colors.primary} />
			<Text color={colors.primary}> {sessionStatus.text}</Text>
			<Text color={colors.textDim}> · {formatDuration(displayDuration)}</Text>
			{sessionStatus.tokenUsage > 0 && (
				<Text color={colors.textDim}> · {formatTokens(sessionStatus.tokenUsage)} tokens</Text>
			)}
			<Text color={colors.textDim}>  (ESC to cancel)</Text>
		</Box>
	);
}
