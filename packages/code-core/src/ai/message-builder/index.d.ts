/**
 * Message Builder
 * Converts database messages to AI SDK format
 */
import type { FileRepository, Message, ModelCapabilities } from "@sylphx/code-core";
import type { ModelMessage } from "ai";
/**
 * Convert session messages to AI SDK ModelMessage format
 * Transforms frozen database content to AI SDK format (no file reading)
 *
 * Step-level system messages: Each step can have a systemMessage field
 * that is inserted as a 'user' role message BEFORE the step's content
 *
 * @param fileRepo Optional FileRepository for loading file-ref content
 *   If not provided, file-ref parts will be skipped (for backward compatibility)
 */
export declare function buildModelMessages(messages: Message[], modelCapabilities?: ModelCapabilities, fileRepo?: FileRepository): Promise<ModelMessage[]>;
//# sourceMappingURL=index.d.ts.map