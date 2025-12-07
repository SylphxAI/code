/**
 * Text Rendering Utilities
 * Helper functions for rendering text with @file tag highlighting
 */
import type React from "react";
/**
 * Render text with @file and [Image #N] tags highlighted
 * Valid tags (in validTags set) are shown with colored backgrounds
 * - @file tags: green background
 * - [Image #N] tags: blue background
 * Invalid tags are rendered as normal text
 */
export declare function renderTextWithTags(text: string, cursorPos: number | undefined, showCursor: boolean, validTags?: Set<string>): React.ReactNode;
/**
 * Extract @file references and [Image #N] tags from text
 */
export declare function extractFileReferences(text: string): string[];
//# sourceMappingURL=text-rendering-utils.d.ts.map