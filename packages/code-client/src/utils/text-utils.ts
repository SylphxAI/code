/**
 * Text Utilities (Browser-safe)
 * Pure functions for text processing - no UI dependencies
 */

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
