/**
 * Base Tool Display Component
 * Unified layout for all tool displays with consistent indent pattern
 *
 * Layout structure:
 * - Header: no indent (status, tool name, args, duration, extra info)
 * - Summary: marginLeft={2} (one-line summary or status message)
 * - Details: marginLeft={4} (detailed output, multiline content)
 */

import type React from "react";
import { Box, Text } from "ink";
import Spinner from "./Spinner.js";
import { useThemeColors, getColors } from "../theme.js";

export interface BaseToolDisplayProps {
	// Header props
	status: "running" | "completed" | "failed";
	toolName: string;
	args?: string;
	duration?: string;
	extraHeaderInfo?: React.ReactNode;

	// Content props
	summary?: React.ReactNode;
	details?: React.ReactNode;
}

/**
 * Status indicator component (spinner or checkmark)
 */
function StatusIndicator({ status }: { status: "running" | "completed" | "failed" }) {
	const colors = useThemeColors();

	if (status === "running") {
		return (
			<>
				<Spinner color={colors.warning} />
				<Text> </Text>
			</>
		);
	}

	return status === "completed" ? <Text color={colors.success}>✓ </Text> : <Text color={colors.error}>✗ </Text>;
}

/**
 * Base tool display component
 * Provides consistent layout structure for all tool displays
 */
export function BaseToolDisplay({
	status,
	toolName,
	args,
	duration,
	extraHeaderInfo,
	summary,
	details,
}: BaseToolDisplayProps) {
	const colors = useThemeColors();

	return (
		<Box flexDirection="column">
			{/* Header - no indent */}
			<Box>
				<StatusIndicator status={status} />
				<Text bold>{toolName}</Text>
				{args && (
					<>
						<Text> </Text>
						<Text>{args}</Text>
					</>
				)}
				{duration && (status === "completed" || status === "running") && (
					<Text color={colors.textDim}> {duration}</Text>
				)}
				{extraHeaderInfo}
			</Box>

			{/* Summary - marginLeft={2} */}
			{summary && <Box marginLeft={2}>{summary}</Box>}

			{/* Details - marginLeft={4} */}
			{details && (
				<Box marginLeft={4} flexDirection="column">
					{details}
				</Box>
			)}
		</Box>
	);
}
