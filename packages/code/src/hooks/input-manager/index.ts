/**
 * Input Mode Manager
 *
 * Centralized keyboard input management system with explicit modes.
 *
 * @example
 * ```tsx
 * import { useInputMode, useInputModeManager, InputMode } from './hooks/input-manager';
 * import { SelectionModeHandler } from './hooks/input-manager/handlers/SelectionModeHandler';
 *
 * function MyComponent() {
 *   // Setup mode context
 *   const inputMode = useInputMode({
 *     pendingInput,
 *     input,
 *     pendingCommand,
 *     debug: true,
 *   });
 *
 *   // Create handlers
 *   const handlers = useMemo(() => [
 *     new SelectionModeHandler({ ... }),
 *     // ... other handlers
 *   ], [deps]);
 *
 *   // Setup manager
 *   useInputModeManager({
 *     context: inputMode,
 *     handlers,
 *     config: { debug: true },
 *   });
 *
 *   return <div>Current mode: {inputMode.mode}</div>;
 * }
 * ```
 */

// Base handler
export { BaseInputHandler } from "./handlers/BaseHandler.js";
export type { CommandAutocompleteModeHandlerDeps } from "./handlers/CommandAutocompleteModeHandler.js";
export { CommandAutocompleteModeHandler } from "./handlers/CommandAutocompleteModeHandler.js";
export type { FileNavigationModeHandlerDeps } from "./handlers/FileNavigationModeHandler.js";
export { FileNavigationModeHandler } from "./handlers/FileNavigationModeHandler.js";
export type { MessageHistoryModeHandlerDeps } from "./handlers/MessageHistoryModeHandler.js";
export { MessageHistoryModeHandler } from "./handlers/MessageHistoryModeHandler.js";
export type { PendingCommandModeHandlerDeps } from "./handlers/PendingCommandModeHandler.js";
export { PendingCommandModeHandler } from "./handlers/PendingCommandModeHandler.js";
export type { SelectionModeHandlerDeps } from "./handlers/SelectionModeHandler.js";
// Concrete handlers
export { SelectionModeHandler } from "./handlers/SelectionModeHandler.js";
export type {
	InputHandler,
	InputModeContext,
	InputModeManagerConfig,
	ModeTransition,
} from "./types.js";
// Core types and enums
export { InputMode } from "./types.js";
export type { InputHandlerDeps } from "./useInputHandlers.js";
// Convenience hook for creating all handlers
export { useInputHandlers } from "./useInputHandlers.js";
export type { UseInputModeProps, UseInputModeReturn } from "./useInputMode.js";
// Hooks
export { useInputMode } from "./useInputMode.js";
export type { UseInputModeManagerProps } from "./useInputModeManager.js";
export { useInputModeManager } from "./useInputModeManager.js";
