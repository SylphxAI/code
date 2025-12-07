/**
 * Ask Tool Display Component
 * Custom display for ask tool with summary support
 */

import type { ToolDisplayProps } from "@sylphx/code-client";
import { useElapsedTime } from "../../hooks/client/useElapsedTime.js";
import { Text } from "ink";
import { BaseToolDisplay } from "../BaseToolDisplay.js";
import { useThemeColors, getColors } from "../../theme.js";

export function AskToolDisplay(props: ToolDisplayProps) {
	const { status, duration, startTime, input, result, error } = props;
	const colors = useThemeColors();

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

	// Prepare summary content
	const summaryContent = (() => {
		if (status === "failed" && error) {
			return <Text color={colors.error}>{error}</Text>;
		}
		if (status === "completed" && answer) {
			const truncated = answer.length > 100 ? `${answer.slice(0, 100)}...` : answer;
			return <Text color={colors.textDim}>Answer: {truncated}</Text>;
		}
		return undefined;
	})();

	return (
		<BaseToolDisplay
			status={status}
			toolName="ask"
			args={question}
			duration={durationDisplay}
			summary={summaryContent}
		/>
	);
}
