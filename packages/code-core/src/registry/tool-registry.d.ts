/**
 * Tool Registry
 *
 * Centralized registry of all AI tools with metadata.
 * This is the single source of truth for tool information.
 */
import type { Tool, ToolCategoryInfo } from "../types/tool.types.js";
/**
 * Tool category metadata
 */
export declare const TOOL_CATEGORIES: {
    readonly filesystem: {
        readonly id: "filesystem";
        readonly name: "Filesystem";
        readonly description: "File and directory operations";
        readonly icon: "📁";
    };
    readonly shell: {
        readonly id: "shell";
        readonly name: "Shell";
        readonly description: "Execute shell commands and scripts";
        readonly icon: "🖥️";
    };
    readonly search: {
        readonly id: "search";
        readonly name: "Search";
        readonly description: "Search and find content in files";
        readonly icon: "🔍";
    };
    readonly interaction: {
        readonly id: "interaction";
        readonly name: "Interaction";
        readonly description: "User interaction and communication";
        readonly icon: "💬";
    };
    readonly todo: {
        readonly id: "todo";
        readonly name: "Todo";
        readonly description: "Task and todo management";
        readonly icon: "✅";
    };
    readonly mcp: {
        readonly id: "mcp";
        readonly name: "MCP";
        readonly description: "Model Context Protocol tools";
        readonly icon: "🔌";
    };
};
/**
 * All registered tools
 */
export declare const TOOLS: {
    readonly read: {
        readonly id: "read";
        readonly name: "Read File";
        readonly category: "filesystem";
        readonly description: "Read contents of a file from the filesystem. Supports pagination with offset and limit parameters for large files.";
        readonly capabilities: {
            readonly isAsync: true;
            readonly supportsParallel: true;
        };
        readonly securityLevel: "safe";
        readonly enabledByDefault: true;
        readonly source: "builtin";
        readonly examples: ["read({ file_path: \"src/app.ts\" })", "read({ file_path: \"large.log\", offset: 100, limit: 50 })"];
    };
    readonly write: {
        readonly id: "write";
        readonly name: "Write File";
        readonly category: "filesystem";
        readonly description: "Write or overwrite a file with new content. Creates parent directories if needed.";
        readonly capabilities: {
            readonly isAsync: true;
            readonly isStateful: true;
            readonly supportsParallel: false;
        };
        readonly securityLevel: "dangerous";
        readonly enabledByDefault: true;
        readonly source: "builtin";
        readonly relatedTools: ["read"];
        readonly examples: ["write({ file_path: \"config.json\", content: \"{\\\"key\\\": \\\"value\\\"}\" })"];
    };
    readonly edit: {
        readonly id: "edit";
        readonly name: "Edit File";
        readonly category: "filesystem";
        readonly description: "Edit a file by replacing specific content. Safer than rewriting the entire file.";
        readonly capabilities: {
            readonly isAsync: true;
            readonly isStateful: true;
            readonly supportsParallel: false;
        };
        readonly securityLevel: "moderate";
        readonly enabledByDefault: true;
        readonly source: "builtin";
        readonly relatedTools: ["read", "write"];
        readonly examples: ["edit({ file_path: \"app.ts\", old_content: \"const x = 1\", new_content: \"const x = 2\" })"];
    };
    readonly bash: {
        readonly id: "bash";
        readonly name: "Execute Bash";
        readonly category: "shell";
        readonly description: "Execute a bash command and return output. Supports background execution and timeouts.";
        readonly capabilities: {
            readonly requiresConfirmation: false;
            readonly isDangerous: true;
            readonly isAsync: true;
            readonly isStateful: true;
            readonly supportsParallel: true;
        };
        readonly securityLevel: "dangerous";
        readonly enabledByDefault: true;
        readonly source: "builtin";
        readonly examples: ["bash({ command: \"ls -la\" })", "bash({ command: \"npm test\", timeout: 60000 })", "bash({ command: \"npm run dev\", run_in_background: true })"];
    };
    readonly grep: {
        readonly id: "grep";
        readonly name: "Grep (Search)";
        readonly category: "search";
        readonly description: "Search for patterns in files using ripgrep. Supports regex, glob filters, and context lines.";
        readonly capabilities: {
            readonly isAsync: true;
            readonly supportsParallel: true;
        };
        readonly securityLevel: "safe";
        readonly enabledByDefault: true;
        readonly source: "builtin";
        readonly relatedTools: ["glob"];
        readonly examples: ["grep({ pattern: \"TODO\", path: \"src/\" })", "grep({ pattern: \"function.*async\", glob: \"*.ts\", output_mode: \"files_with_matches\" })"];
    };
    readonly glob: {
        readonly id: "glob";
        readonly name: "Glob (Find Files)";
        readonly category: "search";
        readonly description: "Find files matching glob patterns. Fast file pattern matching.";
        readonly capabilities: {
            readonly isAsync: true;
            readonly supportsParallel: true;
        };
        readonly securityLevel: "safe";
        readonly enabledByDefault: true;
        readonly source: "builtin";
        readonly relatedTools: ["grep"];
        readonly examples: ["glob({ pattern: \"**/*.ts\" })", "glob({ pattern: \"src/**/*.test.ts\" })"];
    };
    readonly ask: {
        readonly id: "ask";
        readonly name: "Ask User";
        readonly category: "interaction";
        readonly description: "Ask the user a question and get their response. Supports multiple choice and free text.";
        readonly capabilities: {
            readonly isAsync: true;
            readonly isStateful: true;
            readonly supportsParallel: false;
        };
        readonly securityLevel: "safe";
        readonly enabledByDefault: true;
        readonly source: "builtin";
        readonly unsupportedByModels: ["o1", "o1-mini"];
        readonly examples: ["ask({ questions: [{ question: \"Which approach?\", options: [...] }] })"];
    };
    readonly updateTodos: {
        readonly id: "updateTodos";
        readonly name: "Update Todos";
        readonly category: "todo";
        readonly description: "Update the todo list for the current session. Can add, modify, or remove todos.";
        readonly capabilities: {
            readonly isAsync: true;
            readonly isStateful: true;
            readonly supportsParallel: false;
        };
        readonly securityLevel: "safe";
        readonly enabledByDefault: true;
        readonly source: "builtin";
        readonly unsupportedByModels: ["o1", "o1-mini"];
        readonly examples: ["updateTodos({ todos: [{ content: \"Fix bug\", status: \"in_progress\" }] })"];
    };
};
/**
 * Get all tools
 */
export declare function getAllTools(): Tool[];
/**
 * Get tool by ID
 */
export declare function getTool(toolId: string): Tool | undefined;
/**
 * Get tools by category
 */
export declare function getToolsByCategory(category: string): Tool[];
/**
 * Get all tool categories
 */
export declare function getAllCategories(): ToolCategoryInfo[];
/**
 * Get category info
 */
export declare function getCategory(categoryId: string): ToolCategoryInfo | undefined;
/**
 * Check if tool is supported by model
 *
 * @param toolId - Tool ID
 * @param modelId - Model ID
 * @returns true if tool is supported by the model
 */
export declare function isToolSupportedByModel(toolId: string, modelId: string): boolean;
/**
 * Get tools supported by a specific model
 *
 * @param modelId - Model ID
 * @returns List of tools supported by the model
 */
export declare function getToolsSupportedByModel(modelId: string): Tool[];
/**
 * Get tools by security level
 */
export declare function getToolsBySecurityLevel(level: Tool["securityLevel"]): Tool[];
/**
 * Get dangerous tools
 */
export declare function getDangerousTools(): Tool[];
/**
 * Get safe (read-only) tools
 */
export declare function getSafeTools(): Tool[];
//# sourceMappingURL=tool-registry.d.ts.map