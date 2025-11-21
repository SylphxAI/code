/**
 * StatusIndicator Component
 * Displays streaming and compacting status with spinner and contextual text
 *
 * Architecture: Pure UI - displays server-sent data
 * - Duration: Calculated from server-confirmed startTime (optimistic until confirmed)
 * - Output tokens: From server via session-tokens-updated events
 * - Multi-client sync: All clients show same data
 */

import { useThemeColors, useIsCompacting } from "@sylphx/code-client";
import type { MessagePart } from "@sylphx/code-core";
import { Box, Text } from "ink";
import Spinner from "../../../components/Spinner.js";
import { useElapsedTime } from "../../../hooks/client/useElapsedTime.js";
import { useThemeColors, getColors } from "@sylphx/code-client";

interface StatusIndicatorProps {
	isStreaming: boolean;
	streamParts: MessagePart[];
	streamingStartTime?: number | null;
	streamingOutputTokens?: number; // From server via session-tokens-updated events
}

export function StatusIndicator({
	isStreaming,
	streamParts,
	streamingStartTime,
	streamingOutputTokens = 0,
}: StatusIndicatorProps) {
	const isCompacting = useIsCompacting();

	// Calculate elapsed time for streaming
	const { display: elapsedDisplay } = useElapsedTime({
		startTime: streamingStartTime ?? undefined,
		isRunning: isStreaming,
	});

	const colors = useThemeColors();

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

	if (!isStreaming) {
		return (
			<Box paddingY={1}>
				<Text> </Text>
			</Box>
		);
	}

	// Determine status text based on streaming state
	const getStatusText = () => {
		if (streamParts.length === 0) {
			return "Thinking";
		} else if (streamParts.some((p) => p.type === "tool" && p.status === "active")) {
			return "Working";
		} else if (streamParts.some((p) => p.type === "reasoning" && p.status === "active")) {
			return "Reasoning";
		} else {
			return "Generating";
		}
	};

	// Format tokens display
	const formatTokens = (tokens: number) => {
		if (tokens >= 1000) {
			return `${(tokens / 1000).toFixed(1)}k`;
		}
		return String(tokens);
	};

	return (
		<Box paddingY={1}>
			<Spinner color={colors.primary} />
			<Text color={colors.primary}> {getStatusText()}</Text>
			<Text color={colors.textDim}> · {elapsedDisplay}</Text>
			{streamingOutputTokens > 0 && (
				<Text color={colors.textDim}> · {formatTokens(streamingOutputTokens)} tokens</Text>
			)}
			<Text color={colors.textDim}>  (ESC to cancel)</Text>
		</Box>
	);
}
