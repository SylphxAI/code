/**
 * MessagePart Component
 * Unified rendering for both streaming and completed message parts
 *
 * PERFORMANCE: Memoized to prevent re-rendering unchanged message parts
 */

import { exec } from "node:child_process";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { useElapsedTime } from "../hooks/client/useElapsedTime.js";
import { useThemeColors } from "@sylphx/code-client";
import type { MessagePart as MessagePartType } from "@sylphx/code-core";
import { Box, Text } from "ink";
import React, { useEffect, useMemo } from "react";
import MarkdownText from "./MarkdownText.js";
import Spinner from "./Spinner.js";
import { ToolPart } from "./ToolPart.js";

interface MessagePartProps {
	part: MessagePartType | StreamingPart;
	compact?: boolean;
	isFirst?: boolean;
}

// Extended type for streaming parts - UNIFIED with status field
type StreamingPart =
	| {
			type: "text";
			content: string;
			status: "active" | "completed" | "error" | "abort";
	  }
	| {
			type: "reasoning";
			content: string;
			status: "active" | "completed" | "error" | "abort";
			duration?: number;
			startTime?: number;
	  }
	| {
			type: "tool";
			toolId: string;
			name: string;
			status: "active" | "completed" | "error" | "abort";
			duration?: number;
			input?: unknown;
			result?: unknown;
			error?: string;
			startTime?: number;
	  }
	| { type: "file"; mediaType: string; base64: string; status: "completed" }
	| { type: "error"; error: string; status: "completed" };

function MessagePartInternal({ part, compact = false, isFirst = false }: MessagePartProps) {
	const colors = useThemeColors();
	const marginLeft = compact ? 0 : 3;
	const marginTop = isFirst ? 0 : 1;

	if (part.type === "text") {
		return (
			<Box flexDirection="column" marginLeft={marginLeft} marginTop={marginTop}>
				<MarkdownText>{part.content}</MarkdownText>
			</Box>
		);
	}

	if (part.type === "reasoning") {
		// Use unified status field
		const status = "status" in part ? part.status : "completed";
		const isActive = status === "active";

		// Calculate real-time elapsed time for active reasoning
		// useElapsedTime handles both active (real-time) and completed (fixed duration) display
		const { display: durationDisplay } = useElapsedTime({
			startTime: part.startTime,
			duration: part.duration,
			isRunning: isActive,
		});

		if (isActive) {
			// Still streaming - show spinner with real-time duration
			return (
				<Box flexDirection="column" marginLeft={marginLeft} marginTop={marginTop}>
					<Box>
						<Spinner color={colors.warning} />
						<Text color={colors.textDim}> Thinking... {durationDisplay}</Text>
					</Box>
				</Box>
			);
		} else {
			// Show completed/aborted reasoning with humanized duration
			// durationDisplay uses same format as active state (e.g., "523ms", "5.2s", "45s", "1m11s")
			return (
				<Box flexDirection="column" marginLeft={marginLeft} marginTop={marginTop}>
					<Box>
						<Text color={colors.textDim}>Thought {durationDisplay}</Text>
					</Box>
				</Box>
			);
		}
	}

	if (part.type === "error") {
		return (
			<Box marginLeft={marginLeft} marginTop={marginTop}>
				<Text color={colors.error}>{part.error}</Text>
			</Box>
		);
	}

	// File part (image or other files)
	if (part.type === "file") {
		const isImage = part.mediaType.startsWith("image/");

		if (isImage) {
			// Save base64 to temp file and open in system viewer
			const tempPath = useMemo(() => {
				try {
					const ext = part.mediaType.split("/")[1] || "png";
					const filename = `sylphx-${randomBytes(8).toString("hex")}.${ext}`;
					const filepath = join(tmpdir(), filename);
					const buffer = Buffer.from(part.base64, "base64");
					writeFileSync(filepath, buffer);
					return filepath;
				} catch (err) {
					console.error("[MessagePart] Failed to save image:", err);
					return null;
				}
			}, [part.base64, part.mediaType]);

			// Auto-open image in system viewer once
			useEffect(() => {
				if (tempPath) {
					// Use macOS 'open' command (or 'xdg-open' on Linux)
					const openCommand = process.platform === "darwin" ? "open" : "xdg-open";
					exec(`${openCommand} "${tempPath}"`, (error) => {
						if (error) {
							console.error("[MessagePart] Failed to open image:", error);
						}
					});
				}
			}, [tempPath]);

			if (!tempPath) {
				return (
					<Box flexDirection="column" marginLeft={marginLeft} marginTop={marginTop}>
						<Text color={colors.textDim}>Image ({part.mediaType}):</Text>
						<Text color={colors.error}>Failed to save image</Text>
					</Box>
				);
			}

			const fileSize = Math.round((part.base64.length * 3) / 4 / 1024); // Convert base64 to KB

			return (
				<Box flexDirection="column" marginLeft={marginLeft} marginTop={marginTop}>
					<Text color={colors.textDim}>
						Image ({part.mediaType}) - {fileSize}KB
					</Text>
					<Text color={colors.success}>✓ Opened in system viewer</Text>
					<Text color={colors.textDim}>Saved to: {tempPath}</Text>
				</Box>
			);
		} else {
			// Render non-image file info
			return (
				<Box flexDirection="column" marginLeft={marginLeft} marginTop={marginTop}>
					<Text color={colors.textDim}>File: {part.mediaType}</Text>
					<Text color={colors.textDim}>Size: {Math.round(part.base64.length * 0.75)} bytes</Text>
				</Box>
			);
		}
	}

	// Tool part
	if (part.type === "tool") {
		return (
			<ToolPart
				name={part.name}
				status={part.status}
				duration={part.duration}
				startTime={part.startTime}
				input={part.input}
				result={part.result}
				error={part.error}
				compact={compact}
				isFirst={isFirst}
			/>
		);
	}

	// System message part
	if (part.type === "system-message") {
		// Humanize message type (e.g., 'resource-warning-memory' → 'Resource Warning - Memory')
		const humanizedType = part.messageType
			.split("-")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");

		return (
			<Box marginLeft={compact ? 0 : 2} marginTop={marginTop}>
				<Text color={colors.textDim}>System: {humanizedType}</Text>
			</Box>
		);
	}

	return null;
}

// Memoize component to prevent re-rendering unchanged message parts
export const MessagePart = React.memo(MessagePartInternal, (prevProps, nextProps) => {
	// Check compact and isFirst props first
	if (prevProps.compact !== nextProps.compact) return false;
	if (prevProps.isFirst !== nextProps.isFirst) return false;

	const prevPart = prevProps.part;
	const nextPart = nextProps.part;

	// Compare based on part type
	if (prevPart.type !== nextPart.type) return false;

	// Type-specific comparisons
	if (prevPart.type === "text" && nextPart.type === "text") {
		return prevPart.content === nextPart.content;
	}

	if (prevPart.type === "reasoning" && nextPart.type === "reasoning") {
		const prevStatus = "status" in prevPart ? prevPart.status : "completed";
		const nextStatus = "status" in nextPart ? nextPart.status : "completed";
		return (
			prevPart.content === nextPart.content &&
			prevStatus === nextStatus &&
			prevPart.duration === nextPart.duration &&
			prevPart.startTime === nextPart.startTime
		);
	}

	if (prevPart.type === "tool" && nextPart.type === "tool") {
		return (
			prevPart.name === nextPart.name &&
			prevPart.status === nextPart.status &&
			prevPart.duration === nextPart.duration &&
			prevPart.startTime === nextPart.startTime &&
			prevPart.input === nextPart.input &&
			prevPart.result === nextPart.result &&
			prevPart.error === nextPart.error
		);
	}

	if (prevPart.type === "file" && nextPart.type === "file") {
		return prevPart.mediaType === nextPart.mediaType && prevPart.base64 === nextPart.base64;
	}

	if (prevPart.type === "error" && nextPart.type === "error") {
		return prevPart.error === nextPart.error;
	}

	// Default: re-render if we can't determine equality
	return false;
});
