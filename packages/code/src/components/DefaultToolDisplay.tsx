/**
 * Default Tool Display Factory
 * Creates a tool display component with custom formatters
 * Generic - does not know about specific tools
 */

import type { ToolDisplayProps } from "@sylphx/code-client";
import { useElapsedTime } from "../hooks/client/useElapsedTime.js";
import type { InputFormatter, ResultFormatter } from "@sylphx/code-core";
import dJSON from "dirty-json";
import { Text, useStdout } from "ink";
import type React from "react";
import { BaseToolDisplay } from "./BaseToolDisplay.js";
import { useThemeColors, getColors } from "../theme.js";

/**
 * Truncate a line to fit terminal width
 * Accounts for indentation prefix (4 chars for "    ")
 */
function truncateLine(line: string, terminalWidth: number): string {
	const maxWidth = terminalWidth - 8; // Leave margin for prefix and safety
	if (line.length <= maxWidth) return line;
	return line.slice(0, maxWidth - 3) + "...";
}

/**
 * Parse partial/dirty JSON into an object with best-effort parsing
 * Handles incomplete JSON during streaming like `{"file_path": "/User` or `{"pattern":"test`
 */
function parsePartialJSON(jsonString: string): Record<string, unknown> {
	// Try standard JSON.parse first (fastest)
	try {
		return JSON.parse(jsonString);
	} catch {
		// Use dirty-json for partial/malformed JSON
		try {
			const parsed = dJSON.parse(jsonString);
			return typeof parsed === "object" && parsed !== null ? parsed : {};
		} catch {
			// Even dirty-json failed, return empty object
			return {};
		}
	}
}


/**
 * Factory function to create a default tool display component
 *
 * @param displayName - Tool display name
 * @param formatArgs - Function to format tool arguments
 * @param formatResult - Function to format tool results
 * @returns A React component for displaying the tool
 */
export function createDefaultToolDisplay(
	displayName: string,
	formatArgs: InputFormatter,
	formatResult: ResultFormatter,
): React.FC<ToolDisplayProps> {
	return function DefaultToolDisplay(props: ToolDisplayProps) {
		const { status, duration, input, result, error, startTime } = props;
		const colors = useThemeColors();
		const { stdout } = useStdout();
		const terminalWidth = stdout?.columns || 80;

		// Calculate real-time elapsed time for running tools
		const { display: durationDisplay } = useElapsedTime({
			startTime,
			duration,
			isRunning: status === "running",
		});

		// Handle streaming case: input might be a partial JSON string during streaming
		// Parse dirty JSON progressively to show partial input as it streams
		const formattedArgs = (() => {
			if (!input) return "";

			if (typeof input === "string") {
				// Dirty JSON - extract what we can and format it
				const partial = parsePartialJSON(input);
				return formatArgs(partial);
			}

			// Valid object
			return formatArgs(input as Record<string, unknown>);
		})();
		const formattedResult = formatResult(result);

		// Prepare summary content
		const summary =
			status === "failed" ? (
				<Text color={colors.error}>{error || "Failed"}</Text>
			) : status === "completed" && formattedResult.summary ? (
				<Text>{formattedResult.summary}</Text>
			) : null;

		// Prepare details content (show formatted lines if available)
		// Truncate lines to prevent wrapping which breaks display
		const details =
			status === "completed" && formattedResult.lines.length > 0 ? (
				<>
					{formattedResult.lines.map((line, i) => (
						<Text key={`${i}-${line.slice(0, 30)}`} color={colors.textDim}>
							{truncateLine(line, terminalWidth)}
						</Text>
					))}
				</>
			) : null;

		return (
			<BaseToolDisplay
				status={status}
				toolName={displayName}
				args={formattedArgs}
				duration={durationDisplay}
				summary={summary}
				details={details}
			/>
		);
	};
}
