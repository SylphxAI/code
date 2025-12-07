/**
 * File Handler
 * Handles file content fetching from object storage
 */
import type { MessagePart, MessageRepository } from "@sylphx/code-core";
import type { ParsedContentPart } from "./types.js";
/**
 * Fetch file content from storage (ChatGPT-style architecture)
 * Files uploaded immediately on paste/select, only fileId reference sent
 */
export declare function buildFrozenContent(userMessageContent: ParsedContentPart[] | null | undefined, messageRepository: MessageRepository): Promise<MessagePart[]>;
//# sourceMappingURL=file-handler.d.ts.map