/**
 * Bash Tool Display (TUI)
 * Shows real-time streaming bash output during tool execution
 */

import { useTRPC } from "@sylphx/code-client";
import type { ToolDisplayProps } from "@sylphx/code-client";
import { truncateString, getRelativePath } from "@sylphx/code-core";
import { Box, Text } from "ink";
import { useEffect, useState } from "react";
import { useElapsedTime } from "../../hooks/client/useElapsedTime.js";
import Spinner from "../Spinner.js";

export function BashToolDisplay(props: ToolDisplayProps) {
	const { name, status, duration, startTime, input, result } = props;
	const trpc = useTRPC();
	const [output, setOutput] = useState<string>("");
	const [bashId, setBashId] = useState<string | null>(null);

	// Calculate real-time elapsed time
	const { display: durationDisplay } = useElapsedTime({
		startTime,
		duration,
		isRunning: status === "running",
	});

	// Extract bash_id from result (set when tool starts)
	useEffect(() => {
		if (result && typeof result === "object" && "bash_id" in result) {
			setBashId((result as any).bash_id);
		}
	}, [result]);

	// Subscribe to bash output stream
	useEffect(() => {
		if (!bashId) {
			setOutput("");
			return;
		}

		const channel = `bash:${bashId}`;
		let subscription: any = null;

		try {
			subscription = trpc.events.subscribe.subscribe(
				{ channel, fromCursor: undefined },
				{
					onData: (event: any) => {
						if (event.payload?.type === "output") {
							const chunk = event.payload.output;
							setOutput((prev) => prev + chunk.data);
						} else if (event.payload?.type === "started") {
							setOutput(""); // Clear on start
						}
					},
					onError: (err: any) => {
						console.error("[BashToolDisplay] Subscription error:", err);
					},
				},
			);
		} catch (error) {
			console.error("[BashToolDisplay] Failed to subscribe:", error);
		}

		return () => {
			if (subscription) {
				subscription.unsubscribe();
			}
		};
	}, [bashId, trpc]);

	// Format command display
	const command = input?.command ? String(input.command) : "";
	const cwd = input?.cwd ? String(input.cwd) : "";
	const runInBackground = input?.run_in_background;

	let commandDisplay = truncateString(command, 80);
	if (runInBackground) {
		commandDisplay += " [background]";
	}
	if (cwd && cwd !== process.cwd()) {
		commandDisplay += ` [in ${getRelativePath(cwd)}]`;
	}

	// Format output for display
	const outputLines = output.split("\n");
	const displayLines = outputLines.slice(0, 50); // Show max 50 lines
	const hasMore = outputLines.length > 50;

	return (
		<Box flexDirection="column">
			{/* Tool header */}
			<Box>
				{status === "running" && (
					<>
						<Spinner color="yellow" />
						<Text> </Text>
					</>
				)}
				{status === "completed" && <Text color="green">✓ </Text>}
				{status === "failed" && <Text color="red">✗ </Text>}
				<Text bold>Bash</Text>
				<Text> {commandDisplay}</Text>
				{durationDisplay && (status === "completed" || status === "running") && (
					<Text dimColor> {durationDisplay}</Text>
				)}
			</Box>

			{/* Real-time output (while running or completed) */}
			{(status === "running" || status === "completed") && displayLines.length > 0 && (
				<Box flexDirection="column" marginLeft={2}>
					{displayLines.map((line, i) => (
						<Text key={`${i}-${line.slice(0, 20)}`} dimColor>
							{`${(i + 1).toString().padStart(6)} │ ${line}`}
						</Text>
					))}
					{hasMore && (
						<Text dimColor>
							{"       ... "}
							{outputLines.length - 50} more lines (use Bash Processes screen to view all)
						</Text>
					)}
				</Box>
			)}

			{/* Status messages */}
			{status === "completed" && displayLines.length === 0 && (
				<Box marginLeft={2}>
					<Text dimColor>Command completed (no output)</Text>
				</Box>
			)}

			{/* Running hint */}
			{status === "running" && bashId && (
				<Box marginLeft={2}>
					<Text dimColor>Press Ctrl+B to move to background · View in Bash Processes (Ctrl+P)</Text>
				</Box>
			)}
		</Box>
	);
}
