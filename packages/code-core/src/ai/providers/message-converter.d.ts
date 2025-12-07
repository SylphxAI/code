/**
 * Message Converter
 * Handles message conversion, fingerprinting, and inconsistency detection
 */
import type { LanguageModelV2CallOptions } from "@ai-sdk/provider";
export interface MessageConversionResult {
    prompt: string;
    shouldForceNewSession: boolean;
    messageFingerprints: string[];
}
interface MessageLike {
    role: string;
    content: unknown;
}
/**
 * Simple message fingerprint for detecting changes
 * Returns a hash of role + first 100 chars of text content
 */
export declare function getMessageFingerprint(message: MessageLike): string;
/**
 * Detect if message history has been rewound or modified
 * Returns true if inconsistency detected
 */
export declare function detectMessageInconsistency(messages: MessageLike[], lastProcessedCount: number, lastMessageFingerprints?: string[]): boolean;
/**
 * Convert Vercel AI SDK messages to a single string prompt
 * Handles tool results by converting them to XML format
 *
 * Session Resume Logic:
 * - When resuming a session (sessionId provided), only sends NEW messages
 * - Requires lastProcessedMessageCount in providerOptions to track what was sent
 * - Detects rewind/edit via message fingerprints
 * - If inconsistency detected, ignores resume and creates new session
 * - If lastProcessedMessageCount not provided when resuming, sends only the last user message + pending tool results
 */
export declare function convertMessagesToString(options: LanguageModelV2CallOptions, isResuming: boolean): MessageConversionResult;
export {};
//# sourceMappingURL=message-converter.d.ts.map