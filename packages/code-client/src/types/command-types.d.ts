/**
 * Command Types
 * Shared types for command system (used by hooks)
 */
import type { ReactNode } from "react";
import type { AIConfig, ProviderId, Session } from "@sylphx/code-core";
import type { CodeClient } from "../lens.js";
/**
 * Option for selection
 */
export interface SelectOption {
    label: string;
    value?: string;
    freeText?: boolean;
    placeholder?: string;
    checked?: boolean;
}
/**
 * Command argument definition
 */
export interface CommandArg {
    name: string;
    description: string;
    required?: boolean;
    loadOptions?: (previousArgs: string[], context?: CommandContext) => Promise<SelectOption[]>;
}
/**
 * Question for selection
 */
export interface Question {
    id: string;
    question: string;
    options: SelectOption[];
    multiSelect?: boolean;
    preSelected?: string[];
}
/**
 * Input options for waitForInput
 */
export type WaitForInputOptions = {
    type: "text";
    prompt?: string;
    placeholder?: string;
} | {
    type: "selection";
    prompt?: string;
    questions: Question[];
};
/**
 * Command execution context
 */
export interface CommandContext {
    args: string[];
    client: CodeClient;
    sendMessage: (content: string) => Promise<void>;
    triggerAIResponse: (message: string, attachments?: Array<{
        path: string;
        relativePath: string;
        size?: number;
    }>) => Promise<void>;
    waitForInput: (options: WaitForInputOptions) => Promise<string | Record<string, string | string[]>>;
    getConfig: () => AIConfig | null;
    saveConfig: (config: AIConfig) => Promise<void>;
    getCurrentSession: () => Session | undefined;
    updateProvider: (provider: ProviderId, data: {
        apiKey?: string;
        defaultModel?: string;
    }) => void;
    setAIConfig: (config: AIConfig) => void;
    updateSessionModel: (sessionId: string, model: string) => Promise<void>;
    updateSessionProvider: (sessionId: string, provider: ProviderId, model: string) => Promise<void>;
    setSelectedProvider: (provider: ProviderId | null) => void;
    setSelectedModel: (model: string | null) => void;
    createSession: (provider: ProviderId, model: string) => Promise<string>;
    setCurrentSession: (sessionId: string | null) => Promise<void>;
    getCurrentSessionId: () => string | null;
    setInputComponent: (component: ReactNode | null, title?: string) => void;
    addLog: (message: string) => void;
}
/**
 * Command definition
 */
export interface Command {
    id: string;
    label: string;
    description: string;
    args?: CommandArg[];
    execute: (context: CommandContext) => Promise<string | undefined> | string | undefined;
}
//# sourceMappingURL=command-types.d.ts.map