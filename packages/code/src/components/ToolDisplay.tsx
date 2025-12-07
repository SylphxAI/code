/**
 * Tool Display Component
 * Simply renders the registered component for a tool
 */

import { useElapsedTime } from "../hooks/client/useElapsedTime.js";
import type { ToolDisplayProps } from "@sylphx/code-client";
import { getToolComponent } from "../utils/tool-configs.js";
import { Text } from "ink";
import React from "react";
import { BaseToolDisplay } from "./BaseToolDisplay.js";
import { useThemeColors, getColors } from "../theme.js";

/**
 * Fallback display for unregistered tools (e.g., MCP tools)
 * Provides smart summary + details display like built-in tools
 */
function FallbackToolDisplay(props: ToolDisplayProps) {
	const { name, status, duration, startTime, input, result, error, showDetails = true } = props;
	const colors = useThemeColors();

	// Calculate real-time elapsed time for running tools
	const { display: durationDisplay } = useElapsedTime({
		startTime,
		duration,
		isRunning: status === "running",
	});

	// Format input for display
	const formattedInput = React.useMemo(() => {
		if (!input || typeof input !== "object") return "";
		const entries = Object.entries(input);
		if (entries.length === 0) return "";
		// Show first key-value pair as preview
		const [key, value] = entries[0];
		const valueStr = typeof value === "string" ? value : JSON.stringify(value);
		return `${key}: ${valueStr.length > 40 ? `${valueStr.slice(0, 40)}...` : valueStr}`;
	}, [input]);

	// Format result for display
	const formattedResult = React.useMemo(() => {
		if (!result) return { summary: undefined, lines: [] };

		// Try to extract meaningful summary
		let summary: string | undefined;
		if (typeof result === "object" && result !== null) {
			// Check for common summary fields
			if ("message" in result) summary = String((result as any).message);
			else if ("summary" in result) summary = String((result as any).summary);
			else if ("content" in result && typeof (result as any).content === "string") {
				const content = String((result as any).content);
				summary = content.length > 100 ? `${content.slice(0, 100)}...` : content;
			}
		}

		// Convert result to lines
		const resultStr =
			typeof result === "string"
				? result
				: typeof result === "object"
					? JSON.stringify(result, null, 2)
					: String(result);
		const lines = resultStr.split("\n").filter((line) => line.trim());

		return { summary, lines };
	}, [result]);

	// Use config-based showDetails
	// Always show details for errors
	const shouldShowDetails = status === "failed" || showDetails;

	// Prepare summary content
	const summary = (() => {
		if (status === "failed" && error) {
			return <Text color={colors.error}>{error}</Text>;
		}
		if (status === "completed" && formattedResult.summary) {
			return <Text color={colors.textDim}>{formattedResult.summary}</Text>;
		}
		return undefined;
	})();

	// Prepare details content
	const details =
		status === "completed" && shouldShowDetails && formattedResult.lines.length > 0 ? (
			<>
				{formattedResult.lines.slice(0, 20).map((line, i) => (
					<Text key={`${i}-${line.slice(0, 30)}`} color={colors.textDim}>
						{line}
					</Text>
				))}
				{formattedResult.lines.length > 20 && (
					<Text color={colors.textDim}>... {formattedResult.lines.length - 20} more lines</Text>
				)}
			</>
		) : undefined;

	return (
		<BaseToolDisplay
			status={status}
			toolName={name}
			args={formattedInput}
			duration={durationDisplay}
			summary={summary}
			details={details}
		/>
	);
}

/**
 * Main ToolDisplay component
 * Uses registered component or falls back to basic display
 */
export function ToolDisplay(props: ToolDisplayProps) {
	const Component = getToolComponent(props.name);

	if (!Component) {
		return <FallbackToolDisplay {...props} />;
	}

	return <Component {...props} />;
}
