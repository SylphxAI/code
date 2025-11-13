/**
 * Configuration modules barrel export
 * Centralized access to configuration-related functionality
 */

// Rules configuration
export * from "./rules.js";
export {
	getDefaultRules,
	loadRuleConfiguration,
	validateRuleConfiguration,
} from "./rules.js";
// Target configurations
export * from "./targets.js";
// Re-export commonly used configuration functions with better naming
export {
	configureTargetDefaults,
	getTargetDefaults,
	validateTargetConfiguration,
} from "./targets.js";
