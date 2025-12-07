/**
 * @sylphx/code-client
 *
 * Lens client + utilities for Sylphx Code.
 * All server data via lens-react live queries.
 */
export { createCodeClient, getClient, initClient, isClientInitialized, useLensClient, LensProvider, useQuery, direct, http, type CodeClient, type DirectTransportOptions, type HttpTransportOptions, type LensServerInterface, type Transport, type Session, type Message, type Step, type Part, type Todo, type UserMessageHistory, type StreamEvent, type ConfigResult, type ProviderInfo, type ProviderSchemaResult, type FetchModelsResult, type TokenizerInfo, type ModelDetailsResult, type ProjectFile, type CountTokensResult, type BashProcess, type CreateSessionInput, type UpdateSessionInput, type SendMessageInput, type SendMessageResult, type TriggerStreamInput, type TriggerStreamResult, type CreateTodoInput, type UpdateTodoInput, type SyncTodosInput, type SetProviderSecretInput, type ExecuteBashInput, type ExecuteBashResult, type UploadFileInput, type AnswerAskInput, type SuccessResult, } from "./lens.js";
export { useLensClient as useTRPCClient } from "./lens.js";
export type { MessagePart, ProviderId } from "@sylphx/code-core";
export interface Provider {
    id: string;
    name: string;
    isConfigured: boolean;
}
export interface ModelInfo {
    id: string;
    name: string;
    contextWindow?: number;
    maxOutputTokens?: number;
}
export { type AppEvents, calculateScrollViewport, clampCursor, eventBus, type FormattedResult, getAbsoluteCursorPosition, getCursorLinePosition, getRelativePath, type InputFormatter, isDefaultCwd, type LinePosition, moveCursorDown, moveCursorUp, pluralize, type ResultFormatter, type ScrollViewportResult, truncateString, } from "@sylphx/code-core";
export { getLastSession, getRecentSessions, type SessionListItem } from "./api/sessions.js";
export * from "./optimistic/index.js";
export type { Command, CommandArg, CommandContext, Question, SelectOption, WaitForInputOptions, } from "./types/command-types.js";
export type { ToolConfig, ToolDisplayProps } from "./types/tool.types.js";
export type { ProviderModelResult } from "./utils/config.js";
export { resolveProviderAndModel } from "./utils/config.js";
export type { ParsedContentPart, ParsedUserInput } from "./utils/parse-user-input.js";
export { parseUserInput } from "./utils/parse-user-input.js";
export { extractFileReferences, renderTextWithTags } from "./utils/text-rendering-utils.js";
export { formatTodoChange, formatTodoCount, getTodoColor, getTodoDisplayText, getTodoIcon, isTodoBold, isTodoDimmed, isTodoStrikethrough, } from "./utils/todo-formatters.js";
export declare const version = "0.1.0";
//# sourceMappingURL=index.d.ts.map