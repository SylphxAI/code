/**
 * Parse User Input
 * Converts user input string with @file references into ordered content parts
 */

import type { FileAttachment } from "@sylphx/code-core";

/**
 * Content part from parsing user input
 */
export type ParsedContentPart =
	| { type: "text"; content: string }
	| {
			type: "file";
			path: string;
			relativePath: string;
			size?: number;
			mimeType?: string;
			imageData?: string; // Base64 encoded image data for images
	  };

/**
 * Result of parsing user input
 */
export interface ParsedUserInput {
	parts: ParsedContentPart[];
}

/**
 * Parse user input into ordered content parts
 *
 * Converts:
 * - "I share @file.pdf to you" + attachments=[{relativePath: "file.pdf", ...}]
 * - "[Image #1] what is it?" + attachments=[{relativePath: "[Image #1]", type: "image", imageData: "..."}]
 * Into:
 * - [{type: 'text', content: 'I share '}, {type: 'file', ...}, {type: 'text', content: ' to you'}]
 * - [{type: 'file', imageData: "...", ...}, {type: 'text', content: ' what is it?'}]
 *
 * Benefits:
 * - Preserves order of text and files/images
 * - Semantic correctness
 * - Backend just needs to transform, not parse
 *
 * @param input - User input string with @file and [Image #N] references
 * @param pendingAttachments - Files and images that user selected
 * @returns Ordered content parts
 */
export function parseUserInput(
	input: string,
	pendingAttachments: FileAttachment[],
): ParsedUserInput {
	const parts: ParsedContentPart[] = [];

	// Validate input
	if (typeof input !== "string") {
		console.error("[parseUserInput] Invalid input type:", typeof input);
		return { parts: [] };
	}

	if (!Array.isArray(pendingAttachments)) {
		console.error("[parseUserInput] Invalid attachments type:", typeof pendingAttachments);
		return { parts: [{ type: "text", content: input }] };
	}

	// Create map for fast lookup - use relativePath as key
	const attachmentMap = new Map(pendingAttachments.map((a) => [a.relativePath, a]));

	// Find all tags (both @file and [Image #N]) with their positions
	interface TagMatch {
		index: number;
		length: number;
		tag: string;
		attachment: FileAttachment | undefined;
	}

	const tagMatches: TagMatch[] = [];

	// Match @filename pattern (any non-whitespace after @)
	const fileRegex = /@([^\s]+)/g;
	let match;
	while ((match = fileRegex.exec(input)) !== null) {
		const fileName = match[1];
		const attachment = attachmentMap.get(fileName);
		tagMatches.push({
			index: match.index,
			length: match[0].length,
			tag: match[0],
			attachment,
		});
	}

	// Match [Image #N] pattern
	const imageRegex = /\[Image #\d+\]/g;
	while ((match = imageRegex.exec(input)) !== null) {
		const imageTag = match[0];
		const attachment = attachmentMap.get(imageTag);
		tagMatches.push({
			index: match.index,
			length: match[0].length,
			tag: match[0],
			attachment,
		});
	}

	// Sort matches by position
	tagMatches.sort((a, b) => a.index - b.index);

	// Process matches in order
	let lastIndex = 0;

	for (const tagMatch of tagMatches) {
		// Add text before tag (if any)
		if (tagMatch.index > lastIndex) {
			const text = input.slice(lastIndex, tagMatch.index);
			if (text) {
				parts.push({ type: "text", content: text });
			}
		}

		// Add file/image part if attachment exists
		if (tagMatch.attachment) {
			const filePart: ParsedContentPart = {
				type: "file",
				path: tagMatch.attachment.path,
				relativePath: tagMatch.attachment.relativePath,
				size: tagMatch.attachment.size,
				mimeType: tagMatch.attachment.mimeType,
			};

			// Include imageData for image attachments
			if (tagMatch.attachment.type === "image" && tagMatch.attachment.imageData) {
				filePart.imageData = tagMatch.attachment.imageData;
			}

			parts.push(filePart);
		} else {
			// Invalid reference (no matching attachment) - keep as text
			parts.push({ type: "text", content: tagMatch.tag });
		}

		lastIndex = tagMatch.index + tagMatch.length;
	}

	// Add remaining text after last match (if any)
	if (lastIndex < input.length) {
		const text = input.slice(lastIndex);
		if (text) {
			parts.push({ type: "text", content: text });
		}
	}

	// Handle empty input or input with no text after removing tags
	if (parts.length === 0 && input.length > 0) {
		// Input was only whitespace or invalid refs
		parts.push({ type: "text", content: input });
	}

	// Handle completely empty input - return at least one empty text part
	// This prevents validation errors downstream
	if (parts.length === 0) {
		console.error("[parseUserInput] Input resulted in empty parts array, adding empty text part");
		parts.push({ type: "text", content: "" });
	}

	return { parts };
}
