/**
 * Tools Index
 * Unified exports for all tools
 * Using explicit exports instead of wildcards to avoid bundler duplicate export issues
 */

// Bash manager
export { bashManager } from "./bash-manager.js";
// Filesystem tools
export {
	editFileTool,
	filesystemTools,
	readFileTool,
	writeFileTool,
} from "./filesystem.js";
// Interaction tools
export {
	askUserSelectionTool,
	clearUserInputHandler,
	getQueueLength,
	hasUserInputHandler,
	interactionTools,
	setQueueUpdateCallback,
	setUserInputHandler,
} from "./interaction.js";
export type { GetToolsOptions } from "./registry.js";

// Registry
export {
	getAISDKTools,
	getAllToolNames,
	getToolCategories,
} from "./registry.js";
// Search tools
export { globTool, grepTool, searchTools } from "./search.js";
// Shell tools
export {
	bashOutputTool,
	executeBashTool,
	killBashTool,
	shellTools,
} from "./shell.js";
export type { TodoToolContext } from "./todo.js";
// Todo tool
export { createTodoTool } from "./todo.js";
