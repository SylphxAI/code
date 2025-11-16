/**
 * File Attachments Hook (ChatGPT-style architecture)
 * Manages file attachments and synchronization with @file references in input
 * Files are uploaded immediately on paste/select, stored by fileId
 */

import { readFile } from "node:fs/promises";
import type { FileAttachment } from "@sylphx/code-core";
import { lookup } from "mime-types";
import { useEffect, useMemo, useState } from "react";
import { getTRPCClient } from "../trpc-provider.js";
import { extractFileReferences } from "../utils/text-rendering-utils.js";

export function useFileAttachments(input: string) {
	const [pendingAttachments, setPendingAttachments] = useState<FileAttachment[]>([]);
	const [attachmentTokens, setAttachmentTokens] = useState<Map<string, number>>(new Map());

	// Sync pending attachments with @file references in input
	useEffect(() => {
		const fileRefs = new Set(extractFileReferences(input));

		// Remove attachments that are no longer in input
		setPendingAttachments((prev) => {
			return prev.filter((att) => fileRefs.has(att.relativePath));
		});
	}, [input]);

	// Create validTags set from pendingAttachments
	const validTags = useMemo(() => {
		return new Set(pendingAttachments.map((att) => att.relativePath));
	}, [pendingAttachments]);

	// Add attachment (ChatGPT-style: immediate upload)
	const addAttachment = async (
		attachment: Omit<FileAttachment, "fileId"> & {
			fileId?: string;
			path?: string;
			imageData?: string;
		},
	) => {
		// If fileId already provided, just add to state
		if (attachment.fileId) {
			setPendingAttachments((prev) => {
				// Check if already attached
				if (prev.some((a) => a.fileId === attachment.fileId)) {
					return prev;
				}
				return [...prev, attachment as FileAttachment];
			});
			return;
		}

		// Otherwise, upload file immediately to get fileId
		try {
			const client = await getTRPCClient();

			// Read file content
			let base64Content: string;
			let mimeType: string;
			let size: number;

			if (attachment.imageData) {
				// Image from clipboard
				base64Content = attachment.imageData;
				mimeType = attachment.mimeType || "image/png";
				size = attachment.size || Buffer.from(attachment.imageData, "base64").length;
			} else if (attachment.path) {
				// File from disk
				const buffer = await readFile(attachment.path);
				base64Content = buffer.toString("base64");
				mimeType = attachment.mimeType || lookup(attachment.path) || "application/octet-stream";
				size = attachment.size || buffer.length;
			} else {
				console.error("[addAttachment] No fileId, path, or imageData provided");
				return;
			}

			// Upload to server
			const result = await client.file.upload.mutate({
				relativePath: attachment.relativePath,
				mediaType: mimeType,
				size,
				content: base64Content,
			});

			// Add to state with fileId
			setPendingAttachments((prev) => {
				// Check if already attached
				if (prev.some((a) => a.fileId === result.fileId)) {
					return prev;
				}
				return [
					...prev,
					{
						fileId: result.fileId,
						relativePath: attachment.relativePath,
						size,
						mimeType,
						type: attachment.type,
					},
				];
			});
		} catch (error) {
			console.error("[addAttachment] Failed to upload file:", error);
			// Don't add to state if upload fails
		}
	};

	// Clear all attachments
	const clearAttachments = () => {
		setPendingAttachments([]);
	};

	// Set token count for an attachment
	const setAttachmentTokenCount = (path: string, tokens: number) => {
		setAttachmentTokens((prev) => new Map(prev).set(path, tokens));
	};

	return {
		pendingAttachments,
		setPendingAttachments,
		attachmentTokens,
		validTags,
		addAttachment,
		clearAttachments,
		setAttachmentTokenCount,
	};
}
