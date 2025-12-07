/**
 * Headless Display
 * Formatting and display logic for headless mode (non-TUI)
 */
/**
 * Headless display interface
 */
export interface HeadlessDisplay {
    onToolCall: (toolName: string, input: unknown) => void;
    onToolResult: (toolName: string, result: unknown, duration: number) => void;
    onTextDelta: (text: string) => void;
    onComplete: () => void;
    hasOutput: () => boolean;
}
/**
 * Display callbacks for headless mode
 */
export declare function createHeadlessDisplay(quiet: boolean): HeadlessDisplay;
//# sourceMappingURL=headless-display.d.ts.map