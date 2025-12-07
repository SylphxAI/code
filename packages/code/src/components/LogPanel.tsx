/**
 * Log Panel Component
 * Display real-time logs for debugging
 */

import { Box, Text } from "ink";
import { useThemeColors } from "../theme.js";

interface LogPanelProps {
	logs: string[];
	maxLines?: number;
}

export default function LogPanel({ logs, maxLines = 10 }: LogPanelProps) {
	const displayLogs = logs.slice(-maxLines);
	const colors = useThemeColors();

	return (
		<Box flexDirection="column" borderStyle="single" borderColor={colors.textDim} paddingX={1}>
			<Box marginBottom={1}>
				<Text color={colors.warning} bold>
					DEBUG LOGS
				</Text>
			</Box>
			{displayLogs.length === 0 ? (
				<Text color={colors.textDim}>No logs yet...</Text>
			) : (
				displayLogs.map((log, idx) => (
					<Text key={`${idx}-${log.slice(0, 50)}`} color={colors.textDim}>
						{log}
					</Text>
				))
			)}
		</Box>
	);
}
