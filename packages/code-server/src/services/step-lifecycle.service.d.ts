/**
 * Step Lifecycle Service
 * Manages AI SDK v5 multi-step streaming lifecycle
 *
 * Responsibilities:
 * - Create step records in database (prepareStep)
 * - Check and inject dynamic system messages
 * - Complete steps and update database (onStepFinish)
 * - Emit step events to clients
 * - Coordinate with token tracking for checkpoints
 *
 * Architecture:
 * - Uses AI SDK's native prepareStep and onStepFinish hooks
 * - Stateless (no step state beyond database)
 * - Event-driven (emits to observer)
 */
import type { MessagePart, MessageRepository, SessionRepository } from "@sylphx/code-core";
import type { AppContext } from "../context.js";
import type { StreamEvent } from "./streaming.service.js";
/**
 * Prepare step before execution
 * Called by AI SDK's prepareStep hook
 *
 * Returns: Modified messages array with injected system messages (if any)
 */
export declare function prepareStep(stepNumber: number, assistantMessageId: string, sessionId: string, messages: any[], // AI SDK ModelMessage[]
steps: any[], // AI SDK previous steps
sessionRepository: SessionRepository, messageRepository: MessageRepository, providerInstance: any, modelName: string, providerConfig: any, observer: {
    next: (event: StreamEvent) => void;
}, stepIdMap: Map<number, string>): Promise<{
    messages?: any[];
} | {}>;
/**
 * Complete step after execution
 * Called by AI SDK's onStepFinish hook
 */
export declare function completeStep(stepNumber: number, assistantMessageId: string, sessionId: string, stepResult: any, // AI SDK StepResult
currentStepParts: MessagePart[], sessionRepository: SessionRepository, messageRepository: MessageRepository, tokenTracker: any, // StreamingTokenTracker
appContext: AppContext, observer: {
    next: (event: StreamEvent) => void;
}, session: {
    provider: string;
    model: string;
}, cwd: string, stepIdMap: Map<number, string>): Promise<number>;
//# sourceMappingURL=step-lifecycle.service.d.ts.map