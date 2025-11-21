/**
 * MessageList Component
 *
 * Simple nested rendering - each message renders its own header + parts
 *
 * PERFORMANCE: Memoized message items to prevent re-renders when parent updates
 */

import type { SessionMessage } from "@sylphx/code-core";
import { Box, Text } from "ink";
import React from "react";
import MarkdownText from "./MarkdownText.js";
import { MessagePart } from "./MessagePart.js";
import { indicators } from "../utils/colors.js";

interface MessageListProps {
	messages: SessionMessage[];
	attachmentTokens: Map<string, number>;
	hideMessageTitles?: boolean;
	hideMessageUsage?: boolean;
}

// Memoized message header component to prevent re-renders
const MessageHeader = React.memo(({ msg }: { msg: SessionMessage }) => {
	if (msg.role === "user") {
		return <Text color="cyan">{indicators.user} YOU</Text>;
	}

	if (msg.role === "system") {
		// Extract system message type from <system_message type="..."> tag
		const content = msg.content?.[0]?.type === "text" ? msg.content[0].content : "";
		const typeMatch = content.match(/<system_message type="([^"]+)">/);
		const messageType = typeMatch ? typeMatch[1] : "info";

		return (
			<Box flexDirection="row">
				<Text color="yellow">{indicators.system} SYSTEM</Text>
				<Text color="yellow" dimColor>
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
		return <Text color="green">{indicators.assistant} SYLPHX</Text>;
	}

	const firstProvider = stepsWithModel[0].provider;
	const firstModel = stepsWithModel[0].model;
	const allSame = stepsWithModel.every(
		(s) => s.provider === firstProvider && s.model === firstModel,
	);

	if (allSame) {
		return (
			<Box flexDirection="row">
				<Text color="green">{indicators.assistant} SYLPHX</Text>
				<Text dimColor>
					{" "}
					· {firstProvider} · {firstModel}
				</Text>
			</Box>
		);
	}

	const uniqueModels = new Set(stepsWithModel.map((s) => `${s.provider}/${s.model}`));
	return (
		<Box flexDirection="row">
			<Text color="green">{indicators.assistant} SYLPHX</Text>
			<Text dimColor> · Mixed {uniqueModels.size} models</Text>
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

					{/* Message Content (Step-based or fallback to content array) */}
					{msg.role === "user" || msg.role === "system" ? (
						// User/System message: reconstruct original text with inline @file highlighting
						msg.steps && msg.steps.length > 0 ? (
							<Box paddingTop={0} paddingX={1} flexDirection="row">
								{hideMessageTitles && (
									<Text color={msg.role === "user" ? "cyan" : "yellow"}>
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
										} else if (part.type === "file") {
											fullText += `@${part.relativePath}`;
											fileMap.set(part.relativePath, true);
										} else if (part.type === "error") {
											// Ensure error is converted to string to prevent React rendering issues
											const errorStr =
												typeof part.error === "string"
													? part.error
													: part.error instanceof Error
														? part.error.message
														: String(part.error);
											fullText += `[Error: ${errorStr}]`;
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
															color="green"
														>
															{seg.text}
														</Text>
													) : msg.role === "system" ? (
														// System messages: render plain text (no markdown to avoid Box nesting)
														<Text
															key={`line-${lineIdx}-seg-${segIdx}-${seg.text.slice(0, 10)}`}
															color="yellow"
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
						) : msg.content && msg.content.length > 0 ? (
							<Box paddingTop={0} paddingX={1} flexDirection="row">
								{hideMessageTitles && (
									<Text color={msg.role === "user" ? "cyan" : "yellow"}>
										{msg.role === "user" ? indicators.user : indicators.system}{" "}
									</Text>
								)}
								<Box flexDirection="column" marginLeft={hideMessageTitles ? 0 : 2}>
								{(() => {
									// Same logic for legacy content array
									let fullText = "";
									const fileMap = new Map<string, boolean>();

									for (const part of msg.content) {
										if (part.type === "text") {
											fullText += part.content;
										} else if (part.type === "file") {
											fullText += `@${part.relativePath}`;
											fileMap.set(part.relativePath, true);
										} else if (part.type === "error") {
											// Ensure error is converted to string to prevent React rendering issues
											const errorStr =
												typeof part.error === "string"
													? part.error
													: part.error instanceof Error
														? part.error.message
														: String(part.error);
											fullText += `[Error: ${errorStr}]`;
										}
									}

									// For system messages, remove <system_message> tags and clean content
									if (msg.role === "system") {
										fullText = fullText
											.replace(/<system_message[^>]*>/g, "")
											.replace(/<\/system_message>/g, "")
											.trim();
									}

									const lines = fullText.split("\n");

									return lines.map((line, lineIdx) => {
										const segments: Array<{ text: string; isFile: boolean }> = [];
										const fileRegex = /@([^\s]+)/g;
										let lastIndex = 0;
										let match;

										while ((match = fileRegex.exec(line)) !== null) {
											const matchStart = match.index;
											const fileName = match[1];

											if (matchStart > lastIndex) {
												segments.push({
													text: line.slice(lastIndex, matchStart),
													isFile: false,
												});
											}

											segments.push({
												text: `@${fileName}`,
												isFile: fileMap.has(fileName),
											});

											lastIndex = match.index + match[0].length;
										}

										if (lastIndex < line.length) {
											segments.push({
												text: line.slice(lastIndex),
												isFile: false,
											});
										}

										return (
											<Box
												key={`legacy-line-${lineIdx}`}
												flexDirection="row"
												flexWrap="wrap"
												paddingX={msg.role === "system" ? 1 : 0}
												marginY={msg.role === "system" && lineIdx === 0 ? 0 : undefined}
											>
												{segments.map((seg, segIdx) =>
													seg.isFile ? (
														<Text
															key={`legacy-line-${lineIdx}-seg-${segIdx}-${seg.text.slice(0, 10)}`}
															backgroundColor="#1a472a"
															color="green"
														>
															{seg.text}
														</Text>
													) : msg.role === "system" ? (
														// System messages: render plain text (no markdown to avoid Box nesting)
														<Text key={`legacy-line-${lineIdx}-seg-${segIdx}`} color="yellow">
															{seg.text}
														</Text>
													) : (
														// User messages: use MarkdownText (safe because not nested in Text)
														<MarkdownText key={`legacy-line-${lineIdx}-seg-${segIdx}`}>
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
					msg.steps && msg.steps.length > 0 ? (
						<Box paddingTop={0} paddingX={1} flexDirection="row">
							{hideMessageTitles && <Text color="green">{indicators.assistant} </Text>}
							<Box flexDirection="column" flexGrow={1}>
								{(() => {
									// Flatten all parts with globally unique index
									let globalPartIndex = 0;
									const parts = msg.steps.flatMap((step) =>
										step.parts.map((part) => (
											<MessagePart
												key={`${msg.id}-part-${globalPartIndex++}`}
												part={part}
												compact={hideMessageTitles}
											/>
										)),
									);

									// If message is active but no parts yet, show spinner
									if (parts.length === 0 && msg.status === "active") {
										return <Text dimColor>...</Text>;
									}

									return parts;
								})()}
							</Box>
						</Box>
					) : msg.content && msg.content.length > 0 ? (
						<Box paddingTop={0} paddingX={1} flexDirection="row">
							{hideMessageTitles && <Text color="green">{indicators.assistant} </Text>}
							<Box flexDirection="column" flexGrow={1}>
								{msg.content.map((part, partIdx) => (
									<MessagePart
										key={`${msg.id}-part-${partIdx}`}
										part={part}
										compact={hideMessageTitles}
									/>
								))}
							</Box>
						</Box>
					) : msg.status === "active" ? (
						<Box paddingTop={0} paddingX={1} flexDirection="row">
							{hideMessageTitles && <Text color="green">{indicators.assistant} </Text>}
							<Text dimColor>...</Text>
						</Box>
					) : null}

					{/* Attachments (for user/system messages) - extracted from steps.parts or content */}
					{(msg.role === "user" || msg.role === "system") &&
						(() => {
							// Extract file parts from steps or content
							const fileParts =
								msg.steps && msg.steps.length > 0
									? msg.steps.flatMap((step) => step.parts).filter((part) => part.type === "file")
									: msg.content
										? msg.content.filter((part) => part.type === "file")
										: [];

							return fileParts.map((filePart, idx) => (
								<Box key={`${msg.id}-file-${idx}`} marginLeft={3} marginBottom={1}>
									<Text color="green">✓ </Text>
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
									<Box marginLeft={hideMessageTitles ? 0 : 3} marginBottom={1}>
										<Text color="yellow">[Aborted]</Text>
									</Box>
								)}
								{msg.status === "error" && (
									<Box marginLeft={hideMessageTitles ? 0 : 3} marginBottom={1}>
										<Text color="red">[Error]</Text>
									</Box>
								)}
								{!hideMessageUsage && msg.usage && (
									<Box marginLeft={hideMessageTitles ? 0 : 3}>
										<Text dimColor>
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
