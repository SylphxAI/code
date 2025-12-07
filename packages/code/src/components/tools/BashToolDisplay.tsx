/**
 * Bash Tool Display (TUI)
 * Shows bash output during tool execution
 */

import type { ToolDisplayProps } from "@sylphx/code-client";
import { truncateString, getRelativePath } from "@sylphx/code-core";
import { Text } from "ink";
import { useElapsedTime } from "../../hooks/client/useElapsedTime.js";
import { BaseToolDisplay } from "../BaseToolDisplay.js";
import { useThemeColors } from "../../theme.js";

/**
 * Type guard for Bash tool input
 */
interface BashToolInput {
	command: string;
	cwd?: string;
	run_in_background?: boolean;
	timeout?: number;
}

function isBashToolInput(input: unknown): input is BashToolInput {
	return (
		typeof input === "object" &&
		input !== null &&
		"command" in input &&
		typeof (input as any).command === "string"
	);
}

export function BashToolDisplay(props: ToolDisplayProps) {
	const { status, duration, startTime, input, result } = props;
	const colors = useThemeColors();

	// Validate and extract bash tool input
	const bashInput = isBashToolInput(input) ? input : null;

	// Bash mode - for display logic only
	const bashMode =
		result && typeof result === "object" && "mode" in result
			? (result as any).mode
			: bashInput?.run_in_background
				? "background"
				: "active";
	const isBackgroundMode = bashMode === "background";
	const isRunning = status === "running";

	// Calculate real-time elapsed time
	// ALWAYS use tool's startTime and duration from server (source of truth)
	// This ensures duration is consistent across screen switches and multi-client sync
	const { display: durationDisplay } = useElapsedTime({
		startTime,
		duration,
		isRunning,
	});

	// Extract bash_id from result
	const bashId =
		result && typeof result === "object" && "bash_id" in result
			? (result as any).bash_id
			: null;

	// Format command display
	const command = bashInput?.command ?? "";
	const cwd = bashInput?.cwd ?? "";
	const runInBackground = bashInput?.run_in_background;
	const timeout = bashInput?.timeout ?? null;

	let commandDisplay = truncateString(command, 80);
	if (runInBackground) {
		commandDisplay += " [background]";
	}
	if (cwd && cwd !== process.cwd()) {
		commandDisplay += ` [in ${getRelativePath(cwd)}]`;
	}

	// Get output from result
	const finalOutput = (() => {
		if (result && typeof result === "object") {
			const stdout = "stdout" in result ? String((result as any).stdout) : "";
			const stderr = "stderr" in result ? String((result as any).stderr) : "";
			// Prefer stderr if exists (usually errors), otherwise stdout
			return stderr || stdout;
		}
		return "";
	})();

	// Format output for display
	const outputLines = finalOutput.split("\n").filter((line) => line.trim() !== "");
	const displayLines = outputLines.slice(0, 50); // Show max 50 lines
	const hasMore = outputLines.length > 50;

	// Extract error from result if tool failed
	const errorMessage =
		status === "failed" && result && typeof result === "object" && "error" in result
			? String((result as any).error)
			: null;

	// Prepare extra header info (timeout)
	const extraHeaderInfo =
		!isBackgroundMode && timeout && status === "running" ? (
			<Text color={colors.textDim}> (timeout: {Math.floor(timeout / 1000)}s)</Text>
		) : undefined;

	// Prepare summary content (one-line status messages and hints)
	const summary = (() => {
		// Error message
		if (status === "failed" && errorMessage) {
			return <Text color={colors.error}>Tool Error: {errorMessage}</Text>;
		}

		// Background mode summary
		if (isBackgroundMode && status !== "failed") {
			return (
				<Text color={colors.textDim}>
					Running in background. Use Ctrl+P to view all processes
					{bashId ? ` or check bash:${bashId.slice(0, 8)}` : ""}
				</Text>
			);
		}

		// Completed with no output
		if (status === "completed" && displayLines.length === 0) {
			return <Text color={colors.textDim}>Command completed (no output)</Text>;
		}

		// Failed to start bash process
		if (status === "failed" && displayLines.length === 0) {
			return <Text color={colors.error}>Failed to start bash process</Text>;
		}

		// Active mode hint - show Ctrl+B to demote (only when running with bashId)
		if (!isBackgroundMode && status === "running" && bashId) {
			return <Text color={colors.textDim}>Ctrl+B to background</Text>;
		}

		return undefined;
	})();

	// Prepare details content (output from result)
	const details =
		!isBackgroundMode && displayLines.length > 0 ? (
			<>
				{displayLines.map((line, i) => (
					<Text key={`${i}-${line.slice(0, 20)}`} color={colors.textDim}>
						{line}
					</Text>
				))}
				{hasMore && (
					<Text color={colors.textDim}>
						... {outputLines.length - 50} more lines (use Bash Processes screen to view all)
					</Text>
				)}
			</>
		) : undefined;

	return (
		<BaseToolDisplay
			status={status}
			toolName="Bash"
			args={commandDisplay}
			duration={durationDisplay}
			extraHeaderInfo={extraHeaderInfo}
			summary={summary}
			details={details}
		/>
	);
}
