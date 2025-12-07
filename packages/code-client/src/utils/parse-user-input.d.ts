/**
 * Parse User Input
 * Converts user input string with @file references into ordered content parts
 */
import type { FileAttachment } from "@sylphx/code-core";
/**
 * Content part from parsing user input (ChatGPT-style architecture)
 * Files uploaded immediately on paste/select, only fileId reference sent
 */
export type ParsedContentPart = {
    type: "text";
    content: string;
} | {
    type: "file";
    fileId: string;
    relativePath: string;
    size: number;
    mimeType: string;
};
/**
 * Result of parsing user input
 */
export interface ParsedUserInput {
    parts: ParsedContentPart[];
}
/**
 * Parse user input into ordered content parts (ChatGPT-style architecture)
 *
 * Converts:
 * - "I share @file.pdf to you" + attachments=[{fileId: "abc123", relativePath: "file.pdf", ...}]
 * - "[Image #1] what is it?" + attachments=[{fileId: "xyz789", relativePath: "[Image #1]", ...}]
 * Into:
 * - [{type: 'text', content: 'I share '}, {type: 'file', fileId: "abc123", ...}, {type: 'text', content: ' to you'}]
 * - [{type: 'file', fileId: "xyz789", ...}, {type: 'text', content: ' what is it?'}]
 *
 * Benefits:
 * - Preserves order of text and files/images
 * - Semantic correctness
 * - Backend just needs to transform, not parse
 * - Files already uploaded to object storage (immediate on paste/select)
 *
 * @param input - User input string with @file and [Image #N] references
 * @param pendingAttachments - Files and images that user selected (already uploaded, with fileId)
 * @returns Ordered content parts
 */
export declare function parseUserInput(input: string, pendingAttachments: FileAttachment[]): ParsedUserInput;
//# sourceMappingURL=parse-user-input.d.ts.map