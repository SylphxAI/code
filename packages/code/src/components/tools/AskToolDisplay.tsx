/**
 * Ask Tool Display Component
 * Custom display for ask tool with summary support
 */

import type { ToolDisplayProps } from "@sylphx/code-client";
import { useElapsedTime } from "@sylphx/code-client";
import { Box, Text } from "ink";
import Spinner from "../Spinner.js";

export function AskToolDisplay(props: ToolDisplayProps) {
	const { status, duration, startTime, input, result, error } = props;

	// Calculate real-time elapsed time for running tools
	const { display: durationDisplay } = useElapsedTime({
		startTime,
		duration,
		isRunning: status === "running",
	});

	// Format input (question being asked)
	const question =
		typeof input === "object" && input !== null && "question" in input
			? String(input.question)
			: "";

	// Format result (user's answer) - this is what gets sent back to LLM
	const answer = typeof result === "string" ? result : "";

	// Create summary from answer
	const summary = answer
		? answer.length > 100
			? `${answer.slice(0, 100)}...`
			: answer
		: undefined;

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
				<Text bold>ask</Text>
				{question && (
					<>
						<Text> </Text>
						<Text>{question}</Text>
					</>
				)}
				{durationDisplay && (status === "completed" || status === "running") && (
					<Text dimColor> {durationDisplay}</Text>
				)}
			</Box>

			{/* Answer summary (tool result sent to LLM) */}
			{status === "completed" && summary && (
				<Box marginLeft={2}>
					<Text dimColor>Answer: {summary}</Text>
				</Box>
			)}

			{/* Error */}
			{status === "failed" && error && (
				<Box marginLeft={2}>
					<Text color="red">{error}</Text>
				</Box>
			)}
		</Box>
	);
}
