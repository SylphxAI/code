/**
 * Provider Management Component (V2 - Composition-based)
 * Uses InlineSelection composition pattern instead of custom selection logic
 *
 * ARCHITECTURE: Composition pattern + lens-react v5 API
 * - Uses InlineSelection for step 1 and 2
 * - Custom form for step 3 (provider configuration)
 * - No duplicated filter/selection logic
 * - Uses vanilla client calls: await client.xxx({ input })
 */

import { useLensClient, type ProviderInfo } from "@sylphx/code-client";
import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";
import { InlineSelection } from "../../../components/selection/index.js";
import TextInputWithHint from "../../../components/TextInputWithHint.js";
import type { SelectionOption } from "../../../hooks/useSelection.js";
import { InputContentLayout } from "./InputContentLayout.js";
import { useThemeColors, getColors } from "../../../theme.js";

// Local type definition for ConfigField from provider schema
interface ConfigField {
	key: string;
	label: string;
	type: string;
	secret?: boolean;
	required?: boolean;
	description?: string;
	placeholder?: string;
}

interface ProviderManagementProps {
	initialAction?: "use" | "configure";
	initialProviderId?: string;
	aiConfig: any;
	onComplete: () => void;
	onSelectProvider: (providerId: string) => void | Promise<void>;
	onConfigureProvider: (providerId: string, config: any) => void | Promise<void>;
}

type Step = "select-action" | "select-provider" | "configure-provider";

export function ProviderManagement({
	initialAction,
	initialProviderId,
	aiConfig,
	onComplete,
	onSelectProvider,
	onConfigureProvider,
}: ProviderManagementProps) {
	const colors = useThemeColors();
	const client = useLensClient();

	// If initialProviderId is provided, skip to the appropriate step
	const initialStep: Step = initialProviderId
		? initialAction === "configure"
			? "configure-provider"
			: "select-action"
		: initialAction
			? "select-provider"
			: "select-action";

	const [step, setStep] = useState<Step>(initialStep);
	const [action, setAction] = useState<"use" | "configure">(initialAction || "use");
	const [selectedProvider, setSelectedProvider] = useState<string | null>(
		initialProviderId || null,
	);

	// Config form state
	const [configSchema, setConfigSchema] = useState<ConfigField[]>([]);
	const [formValues, setFormValues] = useState<Record<string, string | number | boolean>>({});
	const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
	const [editingField, setEditingField] = useState(false);
	const [tempStringValue, setTempStringValue] = useState("");

	// Fetch provider metadata from server
	const [providerMetadata, setProviderMetadata] = useState<
		Record<string, { name: string; description: string; isConfigured: boolean }>
	>({});

	useEffect(() => {
		async function loadProviderMetadata() {
			try {
				// Use vanilla client call
				const result = await client.getProviders({ args: {} }) as Record<string, ProviderInfo>;
				// Store full provider info including isConfigured status
				const metadata: Record<
					string,
					{ name: string; description: string; isConfigured: boolean }
				> = {};
				for (const [id, info] of Object.entries(result)) {
					metadata[id] = {
						name: info.name,
						description: info.description,
						isConfigured: info.isConfigured,
					};
				}
				setProviderMetadata(metadata);
			} catch (error) {
				console.error("Failed to load provider metadata:", error);
			}
		}
		loadProviderMetadata();
	}, [client]);

	// Get configured providers from aiConfig (for reading existing config)
	const providers = aiConfig?.providers || {};

	// Get provider options from all available providers (not just configured ones)
	// Use providerMetadata which contains ALL providers from the registry
	// Sort: configured providers first, then by name
	const providerOptions: SelectionOption[] = Object.entries(providerMetadata)
		.map(([id, metadata]) => ({
			label: metadata.name,
			value: id,
			description: metadata.description,
			isConfigured: metadata.isConfigured, // Temporary for sorting
			...(metadata.isConfigured && {
				badge: {
					text: "✓",
					color: "green",
				},
			}),
		}))
		.sort((a, b) => {
			// Configured providers first
			if (a.isConfigured && !b.isConfigured) return -1;
			if (!a.isConfigured && b.isConfigured) return 1;
			// Within same group, sort by name
			return a.label.localeCompare(b.label);
		})
		.map(({ isConfigured, ...option }) => option); // Remove temporary property

	// Action options for step 1
	const actionOptions: SelectionOption[] = [
		{
			label: "Use a provider",
			value: "use",
			description: "Switch to a different AI provider",
		},
		{
			label: "Configure a provider",
			value: "configure",
			description: "Set up API keys and settings",
		},
	];

	// Load config schema when entering configure step
	useEffect(() => {
		if (step === "configure-provider" && selectedProvider) {
			async function loadSchema() {
				try {
					// Use vanilla client call
					const result = await client.getProviderSchema({
						input: { providerId: selectedProvider! },
					}) as { success: boolean; error?: string; schema?: ConfigField[] };

					if (!result.success) {
						console.error("Failed to load provider schema:", result.error);
						return;
					}

					const schema = result.schema || [];
					setConfigSchema(schema);

					// Initialize form values with existing config
					const existingConfig = selectedProvider ? providers[selectedProvider] || {} : {};
					const initialValues: Record<string, string | number | boolean> = {};

					schema.forEach((field) => {
						// Secret fields are never loaded from server (zero-knowledge)
						// Skip initializing them - we'll check isConfigured status instead
						if (field.secret) {
							return;
						}

						if (existingConfig[field.key] !== undefined) {
							initialValues[field.key] = existingConfig[field.key];
						} else if (field.type === "boolean") {
							initialValues[field.key] = false;
						} else if (field.type === "number") {
							initialValues[field.key] = 0;
						} else {
							initialValues[field.key] = "";
						}
					});

					setFormValues(initialValues);
					setCurrentFieldIndex(0);
				} catch (error) {
					console.error("Failed to load provider schema:", error);
				}
			}

			loadSchema();
		}
	}, [step, selectedProvider, providers, client]);

	// Keyboard handling for step 3 (configure provider)
	// IMPORTANT: Must be called unconditionally (before any returns) to satisfy React Hooks rules
	useInput(
		(char, key) => {
			if (key.escape) {
				if (editingField) {
					setEditingField(false);
					setTempStringValue("");
				} else {
					// Go back to provider selection
					setStep("select-provider");
					setSelectedProvider(null);
				}
				return;
			}

			if (!editingField) {
				if (key.upArrow) {
					setCurrentFieldIndex((prev) => Math.max(0, prev - 1));
					return;
				}

				if (key.downArrow) {
					setCurrentFieldIndex((prev) => Math.min(configSchema.length, prev + 1));
					return;
				}

				if (key.return) {
					// Last item is "Save" button
					if (currentFieldIndex === configSchema.length) {
						Promise.resolve(onConfigureProvider(selectedProvider!, formValues)).then(async () => {
							// Refresh provider metadata to update isConfigured status
							try {
								// Use vanilla client call
								const result = await client.getProviders({ args: {} }) as Record<string, ProviderInfo>;
								const metadata: Record<
									string,
									{ name: string; description: string; isConfigured: boolean }
								> = {};
								for (const [id, info] of Object.entries(result)) {
									metadata[id] = {
										name: info.name,
										description: info.description,
										isConfigured: info.isConfigured,
									};
								}
								setProviderMetadata(metadata);
							} catch (error) {
								console.error("Failed to refresh provider metadata:", error);
							}
							onComplete();
						});
					} else {
						const field = configSchema[currentFieldIndex];

						if (field && field.type === "boolean") {
							setFormValues((prev) => ({
								...prev,
								[field.key]: !prev[field.key],
							}));
						} else if (field) {
							setEditingField(true);
							setTempStringValue(String(formValues[field.key] || ""));
						}
					}
					return;
				}

				if (char === " ") {
					const field = configSchema[currentFieldIndex];
					if (field?.type === "boolean") {
						setFormValues((prev) => ({
							...prev,
							[field.key]: !prev[field.key],
						}));
					}
					return;
				}
			}
		},
		{ isActive: step === "configure-provider" && !editingField },
	);

	// Step 1: Select action (use InlineSelection)
	if (step === "select-action") {
		return (
			<InlineSelection
				options={actionOptions}
				subtitle="Manage your AI provider settings"
				filter={false} // No filter needed for 2 options
				onSelect={(value) => {
					setAction(value as "use" | "configure");
					setStep("select-provider");
				}}
				onCancel={onComplete}
			/>
		);
	}

	// Step 2: Select provider (use InlineSelection)
	if (step === "select-provider") {
		return (
			<InlineSelection
				options={providerOptions}
				subtitle={
					action === "use"
						? "Choose which provider to use for new conversations"
						: "Select a provider to configure"
				}
				filter={true}
				onSelect={(value) => {
					if (action === "use") {
						Promise.resolve(onSelectProvider(value as string)).then(() => {
							onComplete();
						});
					} else {
						setSelectedProvider(value as string);
						setStep("configure-provider");
					}
				}}
				onCancel={onComplete}
			/>
		);
	}

	// Step 3: Configure provider - render UI
	if (step === "configure-provider" && selectedProvider) {
		const providerName =
			providerOptions.find((p) => p.value === selectedProvider)?.label || selectedProvider;
		const isProviderConfigured = providerMetadata[selectedProvider]?.isConfigured || false;

		if (configSchema.length === 0) {
			return (
				<InputContentLayout subtitle={`${providerName} is ready to use`} helpText="Esc: Back">
					<Box>
						<Text color={colors.textDim}>No configuration required for this provider.</Text>
					</Box>
				</InputContentLayout>
			);
		}

		return (
			<InputContentLayout
				subtitle={`Enter your ${providerName} credentials`}
				helpText={
					editingField
						? "Enter: Save  |  Esc: Cancel"
						: "↑↓: Navigate  |  Enter: Edit/Save  |  Space: Toggle  |  Esc: Back"
				}
			>
				{/* Fields */}
				<Box flexDirection="column" marginBottom={1}>
					{configSchema.map((field, idx) => {
						const isSelected = idx === currentFieldIndex && !editingField;
						const value = formValues[field.key];
						const isEmpty = field.type === "string" && !value;

						return (
							<Box key={field.key} flexDirection="column" marginBottom={1}>
								<Box>
									<Text color={isSelected ? colors.primary : colors.text} bold={isSelected}>
										{isSelected ? "> " : "  "}
										{field.label}
										{field.required && <Text color={colors.error}> *</Text>}
									</Text>
								</Box>

								{field.description && (
									<Box marginLeft={2}>
										<Text color={colors.textDim}>{field.description}</Text>
									</Box>
								)}

								<Box marginLeft={2}>
									{field.type === "boolean" ? (
										<Text color={isSelected ? colors.primary : colors.textDim}>
											[{value ? "X" : " "}] {value ? "Enabled" : "Disabled"}
										</Text>
									) : field.secret ? (
										// SECRET FIELD: Never show value, only status
										editingField && idx === currentFieldIndex ? (
											<TextInputWithHint
												value={tempStringValue}
												onChange={setTempStringValue}
												onSubmit={(val) => {
													setFormValues((prev) => ({
														...prev,
														[field.key]: val,
													}));
													setEditingField(false);
													setTempStringValue("");
												}}
												placeholder={
													field.placeholder || `Enter new ${field.label.toLowerCase()}...`
												}
												showCursor
												maxLines={1}
											/>
										) : (
											<Text color={isSelected ? colors.primary : value ? colors.success : colors.textDim}>
												{value
													? "••••••••••••••• (press Enter to replace)"
													: isProviderConfigured
														? "✓ Configured (press Enter to replace)"
														: "(not set - press Enter to configure)"}
											</Text>
										)
									) : // NON-SECRET FIELD: Normal display/edit
									editingField && idx === currentFieldIndex ? (
										<TextInputWithHint
											value={tempStringValue}
											onChange={setTempStringValue}
											onSubmit={(val) => {
												const finalValue = field.type === "number" ? Number(val) : val;
												setFormValues((prev) => ({
													...prev,
													[field.key]: finalValue,
												}));
												setEditingField(false);
												setTempStringValue("");
											}}
											placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
											showCursor
											maxLines={1}
										/>
									) : (
										<Text color={isEmpty ? colors.textDim : isSelected ? colors.primary : colors.text}>
											{value
												? String(value).length > 50
													? `${String(value).substring(0, 47)}...`
													: value
												: "(empty)"}
										</Text>
									)}
								</Box>
							</Box>
						);
					})}
				</Box>

				{/* Save Button */}
				<Box marginBottom={1}>
					<Text bold color={currentFieldIndex === configSchema.length ? colors.success : colors.text}>
						{currentFieldIndex === configSchema.length ? "> " : "  "}
						Save Configuration
					</Text>
				</Box>
			</InputContentLayout>
		);
	}

	return null;
}
