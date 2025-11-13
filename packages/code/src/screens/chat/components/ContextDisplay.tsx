/**
 * Context Display Component
 * Shows context window usage and token breakdown in minimal, clean design
 */

import { Box, Text } from "ink";
import React from "react";

interface ContextDisplayProps {
	output: string;
	onComplete: () => void;
}

interface ParsedContextData {
	sessionNote: string;
	usedTokens: string;
	contextLimit: string;
	usedPercent: string;
	modelName: string;
	systemPromptTokens: string;
	systemPromptPercent: string;
	toolsTokens: string;
	toolsPercent: string;
	messagesTokens: string;
	messagesPercent: string;
	freeTokens: string;
	freePercent: string;
	bufferTokens: string;
	bufferPercent: string;
	systemPromptBreakdown: Array<{ name: string; tokens: string }>;
	tools: Array<{ name: string; tokens: string }>;
	toolCount: string;
}

function parseContextOutput(output: string): ParsedContextData | null {
	try {
		const lines = output.split("\n");
		const data: any = {};

		// Parse session note
		data.sessionNote = lines[0]?.includes("📌") ? lines[0] : "";

		// Parse context usage line
		const usageLine = lines.find((l) => l.includes("Context Usage:"));
		if (usageLine) {
			const match = usageLine.match(/(\d+\.?\d*[KM]?)\/(\d+\.?\d*[KM]?) tokens \((\d+\.?\d*)%\)/);
			if (match) {
				data.usedTokens = match[1];
				data.contextLimit = match[2];
				data.usedPercent = match[3];
			}
		}

		// Parse model
		const modelLine = lines.find((l) => l.includes("Model:"));
		if (modelLine) {
			data.modelName = modelLine.split("Model:")[1]?.trim() || "";
		}

		// Parse visual breakdown
		const systemLine = lines.find((l) => l.includes("System prompt:"));
		if (systemLine) {
			const match = systemLine.match(/System prompt:\s*(\d+\.?\d*[KM]?)\s*\((\d+\.?\d*)%\)/);
			if (match) {
				data.systemPromptTokens = match[1];
				data.systemPromptPercent = match[2];
			}
		}

		const toolsLine = lines.find((l) => l.includes("Tools:") && !l.includes("System Tools"));
		if (toolsLine) {
			const match = toolsLine.match(/Tools:\s*(\d+\.?\d*[KM]?)\s*\((\d+\.?\d*)%\)/);
			if (match) {
				data.toolsTokens = match[1];
				data.toolsPercent = match[2];
			}
		}

		const messagesLine = lines.find((l) => l.includes("Messages:"));
		if (messagesLine) {
			const match = messagesLine.match(/Messages:\s*(\d+\.?\d*[KM]?)\s*\((\d+\.?\d*)%\)/);
			if (match) {
				data.messagesTokens = match[1];
				data.messagesPercent = match[2];
			}
		}

		// Parse available space
		const freeLine = lines.find((l) => l.includes("• Free:"));
		if (freeLine) {
			const match = freeLine.match(/(\d+\.?\d*[KM]?) tokens \((\d+\.?\d*)%\)/);
			if (match) {
				data.freeTokens = match[1];
				data.freePercent = match[2];
			}
		}

		const bufferLine = lines.find((l) => l.includes("• Buffer:"));
		if (bufferLine) {
			const match = bufferLine.match(/(\d+\.?\d*[KM]?) tokens \((\d+\.?\d*)%\)/);
			if (match) {
				data.bufferTokens = match[1];
				data.bufferPercent = match[2];
			}
		}

		// Parse system prompt breakdown
		data.systemPromptBreakdown = [];
		let inBreakdown = false;
		for (const line of lines) {
			if (line.includes("System Prompt Breakdown:")) {
				inBreakdown = true;
				continue;
			}
			if (inBreakdown && line.includes("System Tools")) {
				break;
			}
			if (inBreakdown && line.trim() && line.includes(":")) {
				const match = line.match(/\s*(.+?):\s*(\d+\.?\d*[KM]?)\s*tokens/);
				if (match) {
					data.systemPromptBreakdown.push({ name: match[1].trim(), tokens: match[2] });
				}
			}
		}

		// Parse tools
		data.tools = [];
		let inTools = false;
		const toolCountMatch = output.match(/System Tools \((\d+) total\)/);
		data.toolCount = toolCountMatch ? toolCountMatch[1] : "0";

		for (const line of lines) {
			if (line.includes("System Tools")) {
				inTools = true;
				continue;
			}
			if (inTools && line.trim() && line.includes(":")) {
				const match = line.match(/\s*(.+?):\s*(\d+\.?\d*[KM]?)\s*tokens/);
				if (match) {
					data.tools.push({ name: match[1].trim(), tokens: match[2] });
				}
			}
		}

		return data;
	} catch (error) {
		return null;
	}
}

export function ContextDisplay({ output, onComplete }: ContextDisplayProps) {
	const data = parseContextOutput(output);

	// If parsing fails, show raw output
	if (!data) {
		return (
			<Box flexDirection="column" paddingY={1} paddingX={2}>
				<Text>{output}</Text>
				<Box paddingTop={2}>
					<Text color="gray" dimColor>
						Press ESC to close
					</Text>
				</Box>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" paddingY={1} paddingX={2}>
			{data.sessionNote && (
				<Box paddingBottom={1}>
					<Text color="yellow">{data.sessionNote}</Text>
				</Box>
			)}

			{/* Summary */}
			<Box flexDirection="column" gap={0}>
				<Box flexDirection="row">
					<Box width={20}>
						<Text dimColor>Model</Text>
					</Box>
					<Text>{data.modelName}</Text>
				</Box>
				<Box flexDirection="row">
					<Box width={20}>
						<Text dimColor>Context Limit</Text>
					</Box>
					<Text>{data.contextLimit}</Text>
				</Box>
				<Box flexDirection="row">
					<Box width={20}>
						<Text dimColor>Total Used</Text>
					</Box>
					<Text>
						{data.usedTokens} ({data.usedPercent}%)
					</Text>
				</Box>
			</Box>

			<Box paddingY={1}>
				<Text dimColor>{"─".repeat(60)}</Text>
			</Box>

			{/* Breakdown - Base Context (fixed) */}
			<Box paddingBottom={1}>
				<Text dimColor bold>
					Base Context (Fixed)
				</Text>
			</Box>
			<Box flexDirection="column" gap={0} paddingLeft={2}>
				<Box flexDirection="row">
					<Box width={18}>
						<Text dimColor>System prompt</Text>
					</Box>
					<Box width={12}>
						<Text>{data.systemPromptTokens}</Text>
					</Box>
					<Text dimColor>{data.systemPromptPercent}%</Text>
				</Box>
				<Box flexDirection="row">
					<Box width={18}>
						<Text dimColor>Tools ({data.toolCount})</Text>
					</Box>
					<Box width={12}>
						<Text>{data.toolsTokens}</Text>
					</Box>
					<Text dimColor>{data.toolsPercent}%</Text>
				</Box>
			</Box>

			{/* Variable Context */}
			<Box paddingTop={1} paddingBottom={1}>
				<Text dimColor bold>
					Variable Context
				</Text>
			</Box>
			<Box flexDirection="column" gap={0} paddingLeft={2}>
				<Box flexDirection="row">
					<Box width={18}>
						<Text dimColor>Messages</Text>
					</Box>
					<Box width={12}>
						<Text>{data.messagesTokens}</Text>
					</Box>
					<Text dimColor>{data.messagesPercent}%</Text>
				</Box>
			</Box>

			{/* Available Space */}
			<Box paddingTop={1} paddingBottom={1}>
				<Text dimColor bold>
					Available Space
				</Text>
			</Box>
			<Box flexDirection="column" gap={0} paddingLeft={2}>
				<Box flexDirection="row">
					<Box width={18}>
						<Text dimColor>Free space</Text>
					</Box>
					<Box width={12}>
						<Text>{data.freeTokens}</Text>
					</Box>
					<Text dimColor>{data.freePercent}%</Text>
				</Box>
				<Box flexDirection="row" paddingTop={1}>
					<Box width={18}>
						<Text dimColor>Auto-compact at</Text>
					</Box>
					<Box width={12}>
						<Text>{data.bufferTokens}</Text>
					</Box>
					<Text dimColor>({data.bufferPercent}% reserved)</Text>
				</Box>
			</Box>

			{/* Important Notes */}
			<Box paddingTop={1} flexDirection="column">
				<Text dimColor bold>
					About Token Counting:
				</Text>
				<Text dimColor>• Server calculates all tokens using Hugging Face tokenizer</Text>
				<Text dimColor>• StatusBar: Shows session.totalTokens (fast, server-calculated)</Text>
				<Text dimColor>• This command: Full breakdown with details (same source)</Text>
				<Text dimColor>• Multi-client sync: all clients see same counts</Text>
				<Text dimColor>• Never relies on AI provider usage reports</Text>
			</Box>

			{/* Tools list */}
			{data.tools.length > 0 && (
				<>
					<Box paddingY={1}>
						<Text dimColor>{"─".repeat(60)}</Text>
					</Box>
					<Box flexDirection="column" gap={0}>
						<Box paddingBottom={1}>
							<Text dimColor>Tools ({data.toolCount})</Text>
						</Box>
						{data.tools.slice(0, 8).map((tool, i) => (
							<Box key={i} flexDirection="row">
								<Box width={30}>
									<Text dimColor>{tool.name}</Text>
								</Box>
								<Text dimColor>{tool.tokens}</Text>
							</Box>
						))}
						{data.tools.length > 8 && (
							<Box paddingTop={0}>
								<Text dimColor>... and {data.tools.length - 8} more</Text>
							</Box>
						)}
					</Box>
				</>
			)}

			{/* Footer */}
			<Box paddingTop={2}>
				<Text color="gray" dimColor>
					Press ESC to close
				</Text>
			</Box>
		</Box>
	);
}
