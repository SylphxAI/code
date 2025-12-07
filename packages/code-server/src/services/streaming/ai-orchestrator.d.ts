/**
 * AI Orchestrator
 * Handles AI streaming coordination and stream processing
 */
import type { MessagePart, StreamCallbacks } from "@sylphx/code-core";
import type { Observer } from "@trpc/server/observable";
import { type CoreMessage, type LanguageModel, type TextStreamPart } from "ai";
import type { AppContext } from "../../context.js";
import type { StreamEvent } from "./types.js";
/**
 * Tool tracking information
 */
interface ActiveTool {
    name: string;
    startTime: number;
    input: unknown;
}
/**
 * Stream processing state
 */
export interface StreamState {
    currentStepParts: MessagePart[];
    activeTools: Map<string, ActiveTool>;
    currentTextPartIndex: number | null;
    currentReasoningPartIndex: number | null;
    hasEmittedAnyEvent: boolean;
    aborted: boolean;
}
/**
 * Token tracking context
 */
export interface TokenTrackingContext {
    tracker: any;
    sessionId: string;
    baseContextTokens: number;
    appContext: AppContext;
}
/**
 * Options for orchestrating AI stream
 */
export interface OrchestrateStreamOptions {
    model: LanguageModel;
    messages: CoreMessage[];
    systemPrompt: string;
    tools: any;
    abortSignal?: AbortSignal;
    onStepFinish: (stepResult: any) => Promise<void>;
    prepareStep: (params: any) => Promise<any>;
}
/**
 * Persistence context for writing parts to database during streaming
 */
export interface PersistenceContext {
    messageRepository: import("@sylphx/code-core").MessageRepository;
    getStepId: () => string | null;
}
/**
 * Process AI stream and emit events
 * Returns final usage and finish reason
 *
 * LENS ARCHITECTURE: Now writes parts to database incrementally during streaming
 * - Each text-delta updates the part in database immediately
 * - Each tool-call inserts a new part in database
 * - Lens watches database and streams delta updates to subscribers
 * - Events still emitted for backward compatibility (will be removed in Phase 5)
 */
export declare function processAIStream(fullStream: AsyncIterable<TextStreamPart<any>>, observer: Observer<StreamEvent, unknown>, state: StreamState, tokenContext: TokenTrackingContext | null, callbacks: StreamCallbacks, persistence?: PersistenceContext): Promise<{
    finalUsage: any;
    finalFinishReason: string | undefined;
    hasError: boolean;
}>;
/**
 * Create initial stream state
 */
export declare function createStreamState(): StreamState;
/**
 * Orchestrate AI stream with AI SDK - SINGLE STEP
 *
 * Manual looping architecture:
 * - maxSteps: 1 (only ONE step per call)
 * - Caller loops manually based on finishReason
 * - prepareStep/onStepFinish still work for each step
 */
export declare function orchestrateAIStream(options: OrchestrateStreamOptions): Promise<{
    fullStream: AsyncIterable<TextStreamPart<any>>;
    response: Promise<any>;
}>;
export {};
//# sourceMappingURL=ai-orchestrator.d.ts.map