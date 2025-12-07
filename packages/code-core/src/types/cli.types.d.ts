/**
 * CLI-specific type definitions
 * Types for command-line interface operations
 */
/**
 * Application-specific options that extend Commander's built-in parsing
 * Aggregates all possible CLI options across different commands
 */
export interface CommandOptions {
    target?: string;
    verbose?: boolean;
    dryRun?: boolean;
    clear?: boolean;
    mcp?: string[] | null | boolean;
    servers?: string[];
    server?: string;
    all?: boolean;
    rules?: boolean | string;
    outputStyles?: boolean;
    hooks?: boolean;
    namespace?: string;
    limit?: number;
    pattern?: string;
    key?: string;
    confirm?: boolean;
    agents?: string | boolean;
    task?: string;
    output?: string;
    context?: string;
    evaluate?: boolean;
    report?: string;
    concurrency?: number;
    delay?: number;
    includeContent?: boolean;
    extensions?: string[];
    path?: string;
    exclude?: string[];
    query?: string;
    category?: string;
    uri?: string;
    [key: string]: unknown;
}
/**
 * Command configuration interface
 */
export interface CommandConfig {
    name: string;
    description: string;
    handler: CommandHandler;
    options?: Record<string, any>;
}
/**
 * Command handler function type
 * All CLI commands implement this signature
 */
export type CommandHandler = (options: CommandOptions) => Promise<void>;
//# sourceMappingURL=cli.types.d.ts.map