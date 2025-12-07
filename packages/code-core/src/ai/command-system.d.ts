/**
 * Command System - 統一命令系統
 * Feature-first, composable, functional command architecture
 */
import type { CommandOptions } from "../types/cli.types.js";
import { type Result } from "./result.js";
/**
 * Command definition interface
 */
export interface Command {
    name: string;
    description: string;
    handler: CommandHandler;
    options?: CommandOption[];
    middleware?: CommandMiddleware[];
    examples?: string[];
    aliases?: string[];
}
/**
 * Command option definition
 */
export interface CommandOption {
    name: string;
    description: string;
    type: "string" | "number" | "boolean" | "array";
    required?: boolean;
    default?: unknown;
    choices?: unknown[];
    validate?: (value: unknown) => boolean | string;
}
/**
 * Command middleware interface
 */
export interface CommandMiddleware {
    name: string;
    before?: (context: CommandContext) => Promise<void>;
    after?: (context: CommandContext, result: CommandResult) => Promise<void>;
    onError?: (context: CommandContext, error: Error) => Promise<void>;
}
/**
 * Command context
 */
export interface CommandContext {
    command: Command;
    options: CommandOptions;
    args: string[];
    startTime: number;
    metadata?: Record<string, unknown>;
}
/**
 * Command result
 */
export type CommandResult = Result<unknown, Error>;
/**
 * Command handler function
 */
export type CommandHandler = (context: CommandContext) => Promise<CommandResult>;
/**
 * Command registry
 */
export declare class CommandRegistry {
    private commands;
    private aliases;
    private globalMiddleware;
    /**
     * Register a command
     */
    register(command: Command): void;
    /**
     * Unregister a command
     */
    unregister(name: string): boolean;
    /**
     * Get command by name or alias
     */
    get(nameOrAlias: string): Command | null;
    /**
     * Check if command exists
     */
    has(nameOrAlias: string): boolean;
    /**
     * List all commands
     */
    list(): Command[];
    /**
     * Get command names
     */
    names(): string[];
    /**
     * Add global middleware
     */
    addMiddleware(middleware: CommandMiddleware): void;
    /**
     * Remove global middleware
     */
    removeMiddleware(name: string): boolean;
    /**
     * Execute a command
     */
    execute(nameOrAlias: string, options?: CommandOptions, args?: string[]): Promise<CommandResult>;
    /**
     * Validate command options
     */
    private validateOptions;
}
/**
 * Command builder
 */
export declare class CommandBuilder {
    private command;
    name(name: string): CommandBuilder;
    description(description: string): CommandBuilder;
    handler(handler: CommandHandler): CommandBuilder;
    option(option: CommandOption): CommandBuilder;
    middleware(middleware: CommandMiddleware): CommandBuilder;
    examples(examples: string[]): CommandBuilder;
    aliases(aliases: string[]): CommandBuilder;
    build(): Command;
}
/**
 * Utility functions
 */
export declare const CommandUtils: {
    /**
     * Create a new command builder
     */
    readonly builder: () => CommandBuilder;
    /**
     * Create a simple command
     */
    readonly create: (name: string, description: string, handler: (options: CommandOptions) => Promise<unknown>) => Command;
    /**
     * Create a command with options
     */
    readonly createWithOptions: (name: string, description: string, options: CommandOption[], handler: (options: CommandOptions) => Promise<unknown>) => Command;
    /**
     * Create option definitions
     */
    readonly option: {
        readonly string: (name: string, description: string, required?: boolean) => CommandOption;
        readonly number: (name: string, description: string, required?: boolean) => CommandOption;
        readonly boolean: (name: string, description: string) => CommandOption;
        readonly array: (name: string, description: string) => CommandOption;
        readonly choice: (name: string, description: string, choices: unknown[], required?: boolean) => CommandOption;
    };
    /**
     * Common middleware
     */
    readonly middleware: {
        readonly logging: () => CommandMiddleware;
        readonly timing: () => CommandMiddleware;
    };
};
//# sourceMappingURL=command-system.d.ts.map