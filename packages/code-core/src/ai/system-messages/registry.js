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
/**
 * Trigger Registry
 * Manages all registered triggers
 */
class TriggerRegistry {
    triggers = new Map();
    /**
     * Register a trigger
     */
    register(trigger) {
        this.triggers.set(trigger.id, trigger);
    }
    /**
     * Unregister a trigger
     */
    unregister(triggerId) {
        this.triggers.delete(triggerId);
    }
    /**
     * Enable/disable a trigger
     */
    setEnabled(triggerId, enabled) {
        const trigger = this.triggers.get(triggerId);
        if (trigger) {
            trigger.enabled = enabled;
        }
    }
    /**
     * Get all registered triggers
     */
    getAll() {
        return Array.from(this.triggers.values());
    }
    /**
     * Get enabled triggers sorted by priority
     */
    getEnabled() {
        return Array.from(this.triggers.values())
            .filter((t) => t.enabled)
            .sort((a, b) => a.priority - b.priority);
    }
    /**
     * Check all enabled triggers
     * Returns ALL triggers that need to fire (sorted by priority)
     */
    async checkAll(context) {
        const enabledTriggers = this.getEnabled();
        const firedTriggers = [];
        for (const trigger of enabledTriggers) {
            try {
                const result = await trigger.hook(context);
                if (result) {
                    firedTriggers.push(result);
                }
            }
            catch (error) {
                console.error(`[TriggerRegistry] Trigger ${trigger.id} failed:`, error);
                // Continue checking other triggers
            }
        }
        return firedTriggers;
    }
}
/**
 * Global trigger registry instance
 */
export const triggerRegistry = new TriggerRegistry();
/**
 * Helper to get session flags safely
 */
export function getSessionFlags(session) {
    return session.flags || {};
}
/**
 * Helper to check if flag is set
 */
export function isFlagSet(session, flagName) {
    const flags = getSessionFlags(session);
    return flags[flagName] === true;
}
//# sourceMappingURL=registry.js.map