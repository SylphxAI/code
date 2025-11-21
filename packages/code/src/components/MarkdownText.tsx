/**
 * Markdown Text Component
 * Renders markdown content in the terminal
 *
 * ENHANCED: Custom HR rendering to prevent wrapping
 * - Detects HR patterns (---, ***, ___)
 * - Renders with fixed width (48 chars) instead of full terminal width
 * - Prevents awkward line wrapping in narrow containers
 *
 * ENHANCED: [Image #N] tag highlighting
 * - Detects [Image #1], [Image #2], etc. patterns
 * - Renders with blue background color
 */

import Markdown from "@jescalan/ink-markdown";
import { Box, Text } from "ink";
import React from "react";
import { useThemeColors } from "@sylphx/code-client";

interface MarkdownTextProps {
	children: string;
	prefix?: string;
	prefixColor?: string;
}

// HR patterns to detect (markdown horizontal rules)
const HR_PATTERNS = [
	/^-{3,}\s*$/, // --- (3 or more dashes)
	/^\*{3,}\s*$/, // *** (3 or more asterisks)
	/^_{3,}\s*$/, // ___ (3 or more underscores)
];

// Image tag pattern to detect and highlight
const IMAGE_TAG_PATTERN = /\[Image #\d+\]/g;

/**
 * Check if a line is a horizontal rule
 */
function isHorizontalRule(line: string): boolean {
	const trimmed = line.trim();
	return HR_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Check if a line contains image tags
 */
function hasImageTags(line: string): boolean {
	return IMAGE_TAG_PATTERN.test(line);
}

/**
 * Render line with image tag highlighting
 * Splits line into text and [Image #N] segments, applies blue background to tags
 */
function renderLineWithImageTags(line: string, key: string): React.ReactElement {
	const parts: React.ReactElement[] = [];
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	// Reset regex state
	IMAGE_TAG_PATTERN.lastIndex = 0;

	while ((match = IMAGE_TAG_PATTERN.exec(line)) !== null) {
		// Add text before tag
		if (match.index > lastIndex) {
			const text = line.slice(lastIndex, match.index);
			parts.push(<Markdown key={`${key}-text-${lastIndex}`}>{text}</Markdown>);
		}

		// Add highlighted tag
		parts.push(
			<Text key={`${key}-tag-${match.index}`} bgColor="#1a2a47" color="#5599FF">
				{match[0]}
			</Text>,
		);

		lastIndex = match.index + match[0].length;
	}

	// Add remaining text
	if (lastIndex < line.length) {
		const text = line.slice(lastIndex);
		parts.push(<Markdown key={`${key}-text-${lastIndex}`}>{text}</Markdown>);
	}

	return <Box key={key}>{parts}</Box>;
}

/**
 * Render markdown text with proper formatting
 * Uses @jescalan/ink-markdown for terminal markdown rendering
 * Custom HR rendering with fixed width (48 chars)
 * If prefix is provided, adds it to the beginning of each line
 *
 * PERFORMANCE: Memoized to prevent re-rendering when content hasn't changed
 */
const MarkdownText = React.memo(function MarkdownText({
	children,
	prefix,
	prefixColor,
}: MarkdownTextProps) {
	// Generate a stable but unique prefix for this component instance (must be before any returns)
	const instanceId = React.useId();
	const colors = useThemeColors();

	// Guard against undefined children
	if (!children || typeof children !== "string") {
		return null;
	}

	// Split content into lines for HR detection
	const lines = children.split("\n");

	// Check if we have any HRs or image tags that need custom rendering
	const hasHR = lines.some(isHorizontalRule);
	const hasImageTag = lines.some(hasImageTags);

	if (!hasHR && !hasImageTag && !prefix) {
		// No HR, no image tags, and no prefix - use default rendering
		return <Markdown>{children}</Markdown>;
	}

	// Process line by line for HR detection, image tag highlighting, and/or prefix

	return (
		<Box flexDirection="column">
			{lines.map((line, idx) => {
				const isHR = isHorizontalRule(line);
				const hasTag = hasImageTags(line);
				// Use unique key with component instance ID to avoid duplicate keys across different instances
				const key = `${instanceId}-line-${idx}`;

				if (isHR) {
					// Custom HR: fixed width (48 chars), centered with dashes
					return (
						<Box key={key}>
							{prefix && <Text color={prefixColor}>{prefix}</Text>}
							<Text color={colors.textDim}>{"─".repeat(48)}</Text>
						</Box>
					);
				}

				if (hasTag) {
					// Line with image tags - render with highlighting
					if (prefix) {
						return (
							<Box key={key}>
								<Text color={prefixColor}>{prefix}</Text>
								{renderLineWithImageTags(line, `${key}-content`)}
							</Box>
						);
					}
					return renderLineWithImageTags(line, key);
				}

				if (prefix) {
					// Regular line with prefix
					return (
						<Box key={key}>
							<Text color={prefixColor}>{prefix}</Text>
							<Markdown>{line}</Markdown>
						</Box>
					);
				}

				// Regular line without prefix
				// Return each line individually to maintain proper spacing
				return <Markdown key={key}>{line}</Markdown>;
			})}
		</Box>
	);
});

export default MarkdownText;
