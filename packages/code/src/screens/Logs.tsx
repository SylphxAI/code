/**
 * Logs Screen
 * View debug logs for troubleshooting
 */

import { useThemeColors, clearDebugLogs, navigateTo, useDebugLogs } from "@sylphx/code-client";
import { Box, Text, useInput } from "ink";
import { useThemeColors, getColors } from "@sylphx/code-client";

export default function Logs() {
	const debugLogs = useDebugLogs();
	const colors = useThemeColors();

	// Keyboard shortcuts
	useInput((input, key) => {
		if (key.escape) {
			navigateTo("chat");
			return;
		}
		if (input === "c" || input === "C") {
			clearDebugLogs();
			return;
		}
	});

	return (
		<Box flexDirection="column" flexGrow={1}>
			{/* Header */}
			<Box flexShrink={0} paddingBottom={1}>
				<Text color={colors.primary}>▌ DEBUG LOGS</Text>
				<Text color={colors.textDim}> · {debugLogs.length} entries</Text>
			</Box>

			{/* Log list */}
			<Box flexGrow={1} flexDirection="column" paddingY={1}>
				{debugLogs.length === 0 ? (
					<Box>
						<Text color={colors.textDim}>No logs yet...</Text>
					</Box>
				) : (
					debugLogs.slice(-100).map((log, idx) => (
						<Text key={idx} color={colors.textDim}>
							{log}
						</Text>
					))
				)}
			</Box>

			{/* Footer */}
			<Box flexShrink={0} paddingTop={1}>
				<Text color={colors.textDim}>Esc Back · C Clear logs</Text>
			</Box>
		</Box>
	);
}
