/**
 * File Attachments Hook (ChatGPT-style architecture)
 * Manages file attachments and synchronization with @file references in input
 * Files are uploaded immediately on paste/select, stored by fileId
 *
 * ARCHITECTURE: lens-react v5 API
 * - client.xxx.useMutation() → React hook { mutate, loading, error }
 */

import { readFile } from "node:fs/promises";
import type { FileAttachment } from "@sylphx/code-core";
import { lookup } from "mime-types";
import { useCallback, useEffect } from "react";
import { useLensClient } from "@sylphx/code-client";
import {
	extractFileReferences,
	usePendingAttachments,
	setPendingAttachments as setPendingAttachmentsSignal,
	addPendingAttachment,
	clearAttachments as clearAttachmentsSignal,
	useAttachmentTokens,
	setAttachmentTokenCount as setAttachmentTokenCountSignal,
	useValidTags,
} from "../../attachment-state.js";

export function useFileAttachments(input: string) {
	const client = useLensClient();
	const pendingAttachments = usePendingAttachments();
	const attachmentTokens = useAttachmentTokens();
	const validTags = useValidTags();

	// Mutation hook for file upload
	const { mutate: uploadFileMutate } = client.uploadFile.useMutation();

	// Sync pending attachments with @file references in input
	useEffect(() => {
		const fileRefs = new Set(extractFileReferences(input));

		// Remove attachments that are no longer in input
		setPendingAttachmentsSignal((prev) => {
			return prev.filter((att) => fileRefs.has(att.relativePath));
		});
	}, [input]);

	// Add attachment (ChatGPT-style: immediate upload)
	const addAttachment = useCallback(async (
		attachment: Omit<FileAttachment, "fileId"> & {
			fileId?: string;
			path?: string;
			imageData?: string;
		},
	) => {
		// If fileId already provided, just add to state
		if (attachment.fileId) {
			addPendingAttachment(attachment as FileAttachment);
			return;
		}

		// Otherwise, upload file immediately to get fileId
		try {
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

			// Use mutation hook
			const result = await uploadFileMutate({
				input: {
					relativePath: attachment.relativePath,
					mediaType: mimeType,
					size,
					content: base64Content,
				},
			}) as { fileId: string };

			// Add to state with fileId
			addPendingAttachment({
				fileId: result.fileId,
				relativePath: attachment.relativePath,
				size,
				mimeType,
				type: attachment.type,
			});
		} catch (error) {
			console.error("[addAttachment] Failed to upload file:", error);
			// Don't add to state if upload fails
		}
	}, [uploadFileMutate]);

	return {
		pendingAttachments,
		setPendingAttachments: setPendingAttachmentsSignal,
		attachmentTokens,
		validTags,
		addAttachment,
		clearAttachments: clearAttachmentsSignal,
		setAttachmentTokenCount: setAttachmentTokenCountSignal,
	};
}
