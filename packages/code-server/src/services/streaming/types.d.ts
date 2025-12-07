/**
 * Type Definitions for Streaming Service
 * All TypeScript types used across streaming modules
 */
import type { AIConfig, MessageRepository, ProviderId, SessionRepository } from "@sylphx/code-core";
import type { AppContext } from "../../context.js";
export type { StreamEvent } from "@sylphx/code-core";
/**
 * Parsed content part from frontend (ChatGPT-style architecture)
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
 * Options for streamAIResponse function
 */
export interface StreamAIResponseOptions {
    appContext: AppContext;
    sessionRepository: SessionRepository;
    messageRepository: MessageRepository;
    aiConfig: AIConfig;
    sessionId: string | null;
    agentId?: string;
    provider?: ProviderId;
    model?: string;
    userMessageContent?: ParsedContentPart[] | null;
    abortSignal?: AbortSignal;
}
//# sourceMappingURL=types.d.ts.map