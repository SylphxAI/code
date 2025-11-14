/**
 * Text Rendering Utilities
 * Helper functions for rendering text with @file tag highlighting
 */

import React from "react";
import { Text } from "ink";

// Tag match interface
interface TagMatch {
	type: "file" | "image";
	matchText: string; // Full match text (e.g., "@file.ts" or "[Image #1]")
	tagValue: string; // Tag value for validation (e.g., "file.ts" or "[Image #1]")
	start: number;
	end: number;
}

/**
 * Render text with @file and [Image #N] tags highlighted
 * Valid tags (in validTags set) are shown with colored backgrounds
 * - @file tags: green background
 * - [Image #N] tags: blue background
 * Invalid tags are rendered as normal text
 */
export function renderTextWithTags(
	text: string,
	cursorPos: number | undefined,
	showCursor: boolean,
	validTags?: Set<string>,
): React.ReactNode {
	// Handle empty text
	if (text.length === 0) {
		// If cursor should be shown at position 0 (empty line with cursor)
		if (cursorPos === 0 && showCursor) {
			return <Text inverse> </Text>;
		}
		return <Text> </Text>;
	}

	// Find all tag matches (both @file and [Image #N])
	const matches: TagMatch[] = [];

	// Find @file tags
	const fileRegex = /@([^\s]+)/g;
	let match;
	while ((match = fileRegex.exec(text)) !== null) {
		if (match[1]) {
			matches.push({
				type: "file",
				matchText: match[0],
				tagValue: match[1],
				start: match.index,
				end: match.index + match[0].length,
			});
		}
	}

	// Find [Image #N] tags
	const imageRegex = /\[Image #\d+\]/g;
	while ((match = imageRegex.exec(text)) !== null) {
		matches.push({
			type: "image",
			matchText: match[0],
			tagValue: match[0],
			start: match.index,
			end: match.index + match[0].length,
		});
	}

	// Sort matches by position
	matches.sort((a, b) => a.start - b.start);

	const parts: React.ReactNode[] = [];
	let lastIndex = 0;
	let partIndex = 0;
	let cursorRendered = cursorPos === undefined;

	// Process each match in order
	for (const tagMatch of matches) {
		const matchStart = tagMatch.start;
		const matchEnd = tagMatch.end;

		// Add text before match
		if (matchStart > lastIndex) {
			const beforeText = text.slice(lastIndex, matchStart);

			// Check if cursor is in this segment
			if (
				!cursorRendered &&
				cursorPos !== undefined &&
				cursorPos >= lastIndex &&
				cursorPos < matchStart
			) {
				const leftPart = beforeText.slice(0, cursorPos - lastIndex);
				const rightPart = beforeText.slice(cursorPos - lastIndex);
				parts.push(
					<Text key={`before-${partIndex}`}>
						{leftPart}
						{showCursor && <Text inverse>{rightPart.length > 0 ? rightPart[0] : " "}</Text>}
						{rightPart.slice(1)}
					</Text>,
				);
				cursorRendered = true;
			} else {
				parts.push(<Text key={`before-${partIndex}`}>{beforeText}</Text>);
			}
			partIndex++;
		}

		// Check if this tag is valid
		const isValidTag = validTags ? validTags.has(tagMatch.tagValue) : false;

		// Determine colors based on tag type
		const bgColor = tagMatch.type === "image" ? "#1a2a47" : "#1a472a"; // Blue for images, green for files
		const fgColor = tagMatch.type === "image" ? "#5599FF" : "#00FF88"; // Light blue for images, light green for files

		// Add tag (with or without highlighting)
		if (
			!cursorRendered &&
			cursorPos !== undefined &&
			cursorPos >= matchStart &&
			cursorPos < matchEnd
		) {
			// Cursor is inside the tag
			const tagText = tagMatch.matchText;
			const leftPart = tagText.slice(0, cursorPos - matchStart);
			const rightPart = tagText.slice(cursorPos - matchStart);

			if (isValidTag || tagMatch.type === "image") {
				// Image tags are always highlighted (no validation needed)
				parts.push(
					<Text key={`tag-${partIndex}`} backgroundColor={bgColor} color={fgColor}>
						{leftPart}
						{showCursor && <Text inverse>{rightPart.length > 0 ? rightPart[0] : " "}</Text>}
						{rightPart.slice(1)}
					</Text>,
				);
			} else {
				// Invalid file tag - render as normal text with cursor
				parts.push(
					<Text key={`tag-${partIndex}`}>
						{leftPart}
						{showCursor && <Text inverse>{rightPart.length > 0 ? rightPart[0] : " "}</Text>}
						{rightPart.slice(1)}
					</Text>,
				);
			}
			cursorRendered = true;
		} else {
			if (isValidTag || tagMatch.type === "image") {
				// Image tags are always highlighted (no validation needed)
				parts.push(
					<Text key={`tag-${partIndex}`} backgroundColor={bgColor} color={fgColor}>
						{tagMatch.matchText}
					</Text>,
				);
			} else {
				// Invalid file tag - render as normal text
				parts.push(<Text key={`tag-${partIndex}`}>{tagMatch.matchText}</Text>);
			}
		}
		partIndex++;

		lastIndex = matchEnd;
	}

	// Add remaining text and handle cursor at/after last index
	if (lastIndex <= text.length) {
		if (!cursorRendered && cursorPos !== undefined && cursorPos >= lastIndex) {
			// Cursor is in remaining text or at end
			const remainingText = text.slice(lastIndex);
			const leftPart = remainingText.slice(0, cursorPos - lastIndex);
			const rightPart = remainingText.slice(cursorPos - lastIndex);

			if (leftPart.length > 0 || rightPart.length > 0) {
				parts.push(
					<Text key={`after-${partIndex}`}>
						{leftPart}
						{showCursor && <Text inverse>{rightPart.length > 0 ? rightPart[0] : " "}</Text>}
						{rightPart.slice(1)}
					</Text>,
				);
			} else {
				// Cursor at end with no remaining text
				if (showCursor) {
					parts.push(
						<Text key="cursor-end" inverse>
							{" "}
						</Text>,
					);
				}
			}
			cursorRendered = true;
		} else if (lastIndex < text.length) {
			// No cursor in remaining text
			const remainingText = text.slice(lastIndex);
			parts.push(<Text key={`after-${partIndex}`}>{remainingText}</Text>);
		}
	}

	// Final fallback: cursor not rendered yet
	if (!cursorRendered && showCursor && cursorPos !== undefined) {
		parts.push(
			<Text key="cursor-fallback" inverse>
				{" "}
			</Text>,
		);
	}

	return <>{parts}</>;
}

/**
 * Extract @file references and [Image #N] tags from text
 */
export function extractFileReferences(text: string): string[] {
	const refs: string[] = [];

	// Extract @file references
	const fileRegex = /@([^\s]+)/g;
	let match;
	while ((match = fileRegex.exec(text)) !== null) {
		if (match[1]) {
			refs.push(match[1]);
		}
	}

	// Extract [Image #N] tags
	const imageRegex = /\[Image #\d+\]/g;
	while ((match = imageRegex.exec(text)) !== null) {
		refs.push(match[0]); // Push the full tag like "[Image #1]"
	}

	return refs;
}
