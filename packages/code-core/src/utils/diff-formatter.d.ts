/**
 * Diff Formatting Utilities
 * Shared utilities for formatting diff-style output across tools
 */
/**
 * Format a single line in diff style with line number and marker
 *
 * @param lineNumber - The line number to display
 * @param marker - The diff marker: '+' for additions, '-' for removals, ' ' for context
 * @param content - The line content
 * @returns Formatted diff line (e.g., "     1 + content")
 */
export declare function formatDiffLine(lineNumber: number, marker: "+" | "-" | " ", content: string): string;
/**
 * Format multiple lines in diff style with consecutive line numbers
 *
 * @param lines - Array of line contents
 * @param marker - The diff marker for all lines
 * @param startLineNumber - Starting line number (default: 1)
 * @returns Array of formatted diff lines
 */
export declare function formatDiffLines(lines: string[], marker: "+" | "-" | " ", startLineNumber?: number): string[];
//# sourceMappingURL=diff-formatter.d.ts.map