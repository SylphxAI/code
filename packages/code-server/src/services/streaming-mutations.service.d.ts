/**
 * Streaming mutations service
 * Implements triggerStream and abortStream logic for Lens API
 *
 * Extracted from tRPC router to be reusable across transport layers
 *
 * ARCHITECTURE: Emit + DB Persistence (Parallel)
 * ==============================================
 * Events are emitted AND persisted to DB in parallel:
 * - emit: For connected clients via Lens subscription
 * - DB: For late subscribers who call getSession after events fired
 *
 * This solves the race condition where client subscribes AFTER events.
 */
import type { SessionRepository, MessageRepository, AIConfig } from "@sylphx/code-core";
import type { AppContext } from "../context.js";
/**
 * Trigger stream mutation parameters
 */
export interface TriggerStreamParams {
    appContext: AppContext;
    sessionRepository: SessionRepository;
    messageRepository: MessageRepository;
    aiConfig: AIConfig;
    input: {
        sessionId: string | null | undefined;
        agentId?: string;
        provider?: string;
        model?: string;
        content: Array<{
            type: "text";
            content: string;
        } | {
            type: "file";
            fileId: string;
            relativePath: string;
            size: number;
            mimeType: string;
        }>;
    };
}
/**
 * Trigger stream mutation result
 */
export interface TriggerStreamResult {
    success: boolean;
    sessionId: string;
    queued?: boolean;
}
/**
 * Trigger streaming mutation
 * Port of tRPC's triggerStream mutation logic
 */
export declare function triggerStreamMutation(params: TriggerStreamParams): Promise<TriggerStreamResult>;
/**
 * Abort stream mutation result
 */
export interface AbortStreamResult {
    success: boolean;
    message: string;
}
/**
 * Abort streaming mutation
 * Port of tRPC's abortStream mutation logic
 */
export declare function abortStreamMutation(sessionId: string): Promise<AbortStreamResult>;
//# sourceMappingURL=streaming-mutations.service.d.ts.map