/**
 * Provider Configuration Helper
 * Shared helper function for provider configuration
 *
 * REFACTORED: Now uses interactiveSetProviderConfig from provider-set-value helper
 */

import type { ProviderId } from "@sylphx/code-core";
import type { CommandContext } from "../types.js";
import { interactiveSetProviderConfig } from "./provider-set-value.js";

/**
 * Configure a provider interactively
 * @deprecated This is now a thin wrapper around interactiveSetProviderConfig
 */
export async function configureProvider(
	context: CommandContext,
	providerId: string,
): Promise<string> {
	// Delegate to the extracted helper
	// Cast to ProviderId - this is a command helper that accepts string from user input
	return await interactiveSetProviderConfig(context, providerId as ProviderId);
}

/**
 * Options cache for dynamic option loading
 */
export const optionsCache = new Map<string, Array<{ id: string; name: string }>>();
