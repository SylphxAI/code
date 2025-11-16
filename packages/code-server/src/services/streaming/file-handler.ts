/**
 * File Handler
 * Handles file content fetching from object storage
 */

import type { MessagePart, MessageRepository } from "@sylphx/code-core";
import type { ParsedContentPart } from "./types.js";

/**
 * Fetch file content from storage (ChatGPT-style architecture)
 * Files uploaded immediately on paste/select, only fileId reference sent
 */
export async function buildFrozenContent(
	userMessageContent: ParsedContentPart[] | null | undefined,
	messageRepository: MessageRepository,
): Promise<MessagePart[]> {
	const frozenContent: MessagePart[] = [];

	if (!userMessageContent) {
		return frozenContent;
	}

	for (const part of userMessageContent) {
		if (part.type === "text") {
			frozenContent.push({
				type: "text",
				content: part.content,
				status: "completed",
			});
		} else if (part.type === "file") {
			try {
				// Fetch file content from object storage using fileId
				const fileRepo = messageRepository.getFileRepository();
				const fileRecord = await fileRepo.getFileContent(part.fileId);

				if (!fileRecord) {
					throw new Error(`File not found in storage: ${part.fileId}`);
				}

				// Convert Buffer to base64 for MessagePart
				const base64Data = fileRecord.content.toString("base64");

				// Create file part (will be migrated to file-ref by addMessage)
				frozenContent.push({
					type: "file",
					relativePath: part.relativePath,
					size: part.size,
					mediaType: part.mimeType,
					base64: base64Data, // Temporary - will be moved to file_contents
					status: "completed",
				});
			} catch (error) {
				// File fetch failed - save error
				console.error("[FileHandler] File fetch failed:", error);
				frozenContent.push({
					type: "error",
					error: `Failed to fetch file: ${part.relativePath}`,
					status: "completed",
				});
			}
		}
	}

	return frozenContent;
}
