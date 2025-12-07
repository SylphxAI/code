/**
 * System Message Trigger Registry
 * Hook-based trigger system for registering and managing system messages
 *
 * Design:
 * - Each trigger is a hook that can be registered/unregistered
 * - Uses session flags to track state changes
 * - Triggers on state transitions (not just thresholds)
 * - Bidirectional notifications (enter + exit states)
 */
import type { MessageRepository } from "../../database/message-repository.js";
import type { Session } from "../../types/session.types.js";
/**
 * Trigger result - message to insert and flag updates
 */
export interface TriggerResult {
    messageType: string;
    message: string;
    flagUpdates: Record<string, boolean>;
}
/**
 * Trigger context - all data available to triggers
 */
export interface TriggerContext {
    session: Session;
    messageRepository: MessageRepository;
    contextTokens?: {
        current: number;
        max: number;
    };
}
/**
 * Trigger hook function
 * Returns null if no action needed, or TriggerResult to insert message
 */
export type TriggerHook = (context: TriggerContext) => Promise<TriggerResult | null>;
/**
 * Trigger registration
 */
export interface TriggerRegistration {
    id: string;
    name: string;
    description: string;
    priority: number;
    enabled: boolean;
    hook: TriggerHook;
}
/**
 * Trigger Registry
 * Manages all registered triggers
 */
declare class TriggerRegistry {
    private triggers;
    /**
     * Register a trigger
     */
    register(trigger: TriggerRegistration): void;
    /**
     * Unregister a trigger
     */
    unregister(triggerId: string): void;
    /**
     * Enable/disable a trigger
     */
    setEnabled(triggerId: string, enabled: boolean): void;
    /**
     * Get all registered triggers
     */
    getAll(): TriggerRegistration[];
    /**
     * Get enabled triggers sorted by priority
     */
    getEnabled(): TriggerRegistration[];
    /**
     * Check all enabled triggers
     * Returns ALL triggers that need to fire (sorted by priority)
     */
    checkAll(context: TriggerContext): Promise<TriggerResult[]>;
}
/**
 * Global trigger registry instance
 */
export declare const triggerRegistry: TriggerRegistry;
/**
 * Helper to get session flags safely
 */
export declare function getSessionFlags(session: Session): Record<string, boolean>;
/**
 * Helper to check if flag is set
 */
export declare function isFlagSet(session: Session, flagName: string): boolean;
export {};
//# sourceMappingURL=registry.d.ts.map