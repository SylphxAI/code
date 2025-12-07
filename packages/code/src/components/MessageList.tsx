/**
 * MessageList Component
 *
 * Simple nested rendering - each message renders its own header + parts
 *
 * PERFORMANCE: Memoized message items to prevent re-renders when parent updates
 */

import type { SessionMessage, MessagePart as MessagePartType } from "@sylphx/code-core";
import { Box, Text } from "ink";
import React, { useState, useEffect } from "react";
import MarkdownText from "./MarkdownText.js";
import { MessagePart } from "./MessagePart.js";
import { indicators } from "../utils/colors.js";
import { useThemeColors } from "../theme.js";

// Animated indicator that pulses between ◆ and ◇
function AnimatedIndicator() {
	const [frame, setFrame] = useState(0);
	const colors = useThemeColors();
	useEffect(() => {
		const timer = setInterval(() => {
			setFrame((prev) => (prev + 1) % 2);
		}, 500);
		return () => clearInterval(timer);
	}, []);
	return <Text color={colors.success}>{frame === 0 ? indicators.assistant : indicators.system} </Text>;
}

interface MessageListProps {
	messages: SessionMessage[];
	attachmentTokens: Map<string, number>;
	hideMessageTitles?: boolean;
	hideMessageUsage?: boolean;
}

// Memoized message header component to prevent re-renders
const MessageHeader = React.memo(({ msg }: { msg: SessionMessage }) => {
	const colors = useThemeColors();

	if (msg.role === "user") {
		return <Text color={colors.primary}>{indicators.user} YOU</Text>;
	}

	if (msg.role === "system") {
		// Extract system message type from <system_message type="..."> tag
		const firstTextPart = msg.steps?.[0]?.parts.find((p) => p.type === "text");
		const content = firstTextPart?.type === "text" ? firstTextPart.content : "";
		const typeMatch = content.match(/<system_message type="([^"]+)">/);
		const messageType = typeMatch ? typeMatch[1] : "info";

		return (
			<Box flexDirection="row">
				<Text color={colors.warning}>{indicators.system} SYSTEM</Text>
				<Text color={colors.warning}>
					{" "}
					· {messageType}
				</Text>
			</Box>
		);
	}

	// Assistant message
	const steps = msg.steps && msg.steps.length > 0 ? msg.steps : [];
	const stepsWithModel = steps.filter((s) => s.provider && s.model);

	if (stepsWithModel.length === 0) {
		return <Text color={colors.success}>{indicators.assistant} SYLPHX</Text>;
	}

	const firstProvider = stepsWithModel[0]?.provider;
	const firstModel = stepsWithModel[0]?.model;
	const allSame = stepsWithModel.every(
		(s) => s.provider === firstProvider && s.model === firstModel,
	);

	if (allSame) {
		return (
			<Box flexDirection="row">
				<Text color={colors.success}>{indicators.assistant} SYLPHX</Text>
				<Text color={colors.textDim}>
					{" "}
					· {firstProvider} · {firstModel}
				</Text>
			</Box>
		);
	}

	const uniqueModels = new Set(stepsWithModel.map((s) => `${s.provider}/${s.model}`));
	return (
		<Box flexDirection="row">
			<Text color={colors.success}>{indicators.assistant} SYLPHX</Text>
			<Text color={colors.textDim}> · Mixed {uniqueModels.size} models</Text>
		</Box>
	);
});

MessageHeader.displayName = "MessageHeader";

export function MessageList({
	messages,
	attachmentTokens,
	hideMessageTitles = true,
	hideMessageUsage = true,
}: MessageListProps) {
	const colors = useThemeColors();

	return (
		<>
			{messages.map((msg) => (
				<Box key={msg.id} flexDirection="column" marginTop={1}>
					{/* Message Header - only show when not hiding titles */}
					{!hideMessageTitles && (
						<Box paddingTop={1} paddingX={1}>
							<MessageHeader msg={msg} />
						</Box>
					)}

					{/* Message Content (Step-based) */}
					{msg.role === "user" || msg.role === "system" ? (
						// User/System message: reconstruct original text with inline @file highlighting
						msg.steps.length > 0 ? (
							<Box paddingTop={0} paddingX={1} flexDirection="row">
								{hideMessageTitles && (
									<Text color={msg.role === "user" ? colors.primary : colors.warning}>
										{msg.role === "user" ? indicators.user : indicators.system}{" "}
									</Text>
								)}
								<Box flexDirection="column" marginLeft={hideMessageTitles ? 0 : 2}>
								{(() => {
									// Reconstruct original text from parts
									const parts = msg.steps.flatMap((step) => step.parts);
									let fullText = "";
									const fileMap = new Map<string, boolean>();

									for (const part of parts) {
										if (part.type === "text") {
											fullText += part.content;
										} else if (part.type === "file" || part.type === "file-ref") {
											fullText += `@${part.relativePath}`;
											fileMap.set(part.relativePath, true);
										} else if (part.type === "error") {
											// Ensure error is converted to string to prevent React rendering issues
											fullText += `[Error: ${part.error}]`;
										}
									}

									// For system messages, remove <system_message> tags and clean content
									if (msg.role === "system") {
										fullText = fullText
											.replace(/<system_message[^>]*>/g, "")
											.replace(/<\/system_message>/g, "")
											.trim();
									}

									// Split by newlines to preserve line breaks
									const lines = fullText.split("\n");

									return lines.map((line, lineIdx) => {
										// Parse each line to find @file references
										const segments: Array<{ text: string; isFile: boolean }> = [];
										const fileRegex = /@([^\s]+)/g;
										let lastIndex = 0;
										let match;

										while ((match = fileRegex.exec(line)) !== null) {
											const matchStart = match.index;
											const fileName = match[1];
											if (!fileName) continue;

											// Add text before @file
											if (matchStart > lastIndex) {
												segments.push({
													text: line.slice(lastIndex, matchStart),
													isFile: false,
												});
											}

											// Add @file reference (only highlight if it's an actual attached file)
											segments.push({
												text: `@${fileName}`,
												isFile: fileMap.has(fileName),
											});

											lastIndex = match.index + match[0].length;
										}

										// Add remaining text
										if (lastIndex < line.length) {
											segments.push({
												text: line.slice(lastIndex),
												isFile: false,
											});
										}

										// Render line with highlighted segments
										// System messages get special styling
										return (
											<Box
												key={`line-${lineIdx}`}
												flexDirection="row"
												flexWrap="wrap"
												paddingX={msg.role === "system" ? 1 : 0}
												marginY={msg.role === "system" && lineIdx === 0 ? 0 : undefined}
											>
												{segments.map((seg, segIdx) =>
													seg.isFile ? (
														<Text
															key={`line-${lineIdx}-seg-${segIdx}-${seg.text.slice(0, 10)}`}
															backgroundColor="#1a472a"
															color={colors.success}
														>
															{seg.text}
														</Text>
													) : msg.role === "system" ? (
														// System messages: render plain text (no markdown to avoid Box nesting)
														<Text
															key={`line-${lineIdx}-seg-${segIdx}-${seg.text.slice(0, 10)}`}
															color={colors.warning}
														>
															{seg.text}
														</Text>
													) : (
														// User messages: use MarkdownText (safe because not nested in Text)
														<MarkdownText
															key={`line-${lineIdx}-seg-${segIdx}-${seg.text.slice(0, 10)}`}
														>
															{seg.text}
														</MarkdownText>
													),
												)}
											</Box>
										);
									});
								})()}
								</Box>
							</Box>
						) : null
					) : // Assistant message: render each part separately (tools, reasoning, files, etc.)
					msg.steps.length > 0 ? (
						<Box paddingTop={0} paddingX={1} flexDirection="row">
							{hideMessageTitles && (msg.status === "active" ? <AnimatedIndicator /> : <Text color={colors.success}>{indicators.assistant} </Text>)}
							<Box flexDirection="column" flexGrow={1}>
								{(() => {
									let globalIdx = 0;
									return msg.steps.flatMap((step, stepIdx) =>
										step.parts.map((part, partIdx) => (
											<MessagePart
												key={`${msg.id}-step-${stepIdx}-part-${partIdx}`}
												part={part}
												compact={hideMessageTitles}
												isFirst={globalIdx++ === 0}
											/>
										)),
									);
								})()}
							</Box>
						</Box>
					) : msg.status === "active" ? (
						<Box paddingTop={0} paddingX={1} flexDirection="row">
							{hideMessageTitles && <AnimatedIndicator />}
						</Box>
					) : null}

					{/* Attachments (for user/system messages) - extracted from steps.parts */}
					{(msg.role === "user" || msg.role === "system") &&
						(() => {
							// Extract file parts from steps
							const fileParts = msg.steps
								.flatMap((step) => step.parts)
								.filter((part): part is Extract<MessagePartType, { type: "file" | "file-ref" }> =>
									part.type === "file" || part.type === "file-ref"
								);

							return fileParts.map((filePart, idx) => (
								<Box key={`${msg.id}-file-${idx}`} marginLeft={3}>
									<Text color={colors.success}>✓ </Text>
									<Text bold>Read {filePart.relativePath}</Text>
								</Box>
							));
						})()}

					{/* Footer (for assistant messages) */}
					{msg.role === "assistant" &&
						msg.status !== "active" &&
						(msg.status === "abort" || msg.status === "error" || (!hideMessageUsage && msg.usage)) && (
							<Box flexDirection="column" marginLeft={hideMessageTitles ? 3 : 0}>
								{msg.status === "abort" && (
									<Box marginLeft={hideMessageTitles ? 0 : 3}>
										<Text color={colors.warning}>[Aborted]</Text>
									</Box>
								)}
								{msg.status === "error" && (
									<Box marginLeft={hideMessageTitles ? 0 : 3}>
										<Text color={colors.error}>[Error]</Text>
									</Box>
								)}
								{!hideMessageUsage && msg.usage && (
									<Box marginLeft={hideMessageTitles ? 0 : 3}>
										<Text color={colors.textDim}>
											{msg.usage.promptTokens.toLocaleString()} →{" "}
											{msg.usage.completionTokens.toLocaleString()}
										</Text>
									</Box>
								)}
							</Box>
						)}
				</Box>
			))}
		</>
	);
}
