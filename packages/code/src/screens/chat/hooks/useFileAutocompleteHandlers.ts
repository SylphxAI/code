/**
 * File Autocomplete Handlers Hook
 *
 * Manages file autocomplete selection and navigation logic.
 * Extracted from Chat.tsx to improve modularity and testability.
 */

import { useCallback } from "react";
import type { FilteredFile } from "@sylphx/code-client";
import type React from "react";

export interface FileAutocompleteHandlersDeps {
	filteredFileInfo: FilteredFile;
	selectedFileIndex: number;
	input: string;
	setInput: (value: string) => void;
	setCursor: (value: number) => void;
	setSelectedFileIndex: React.Dispatch<React.SetStateAction<number>>;
	addAttachment: (file: { path: string; relativePath: string; size: number }) => void;
}

export interface FileAutocompleteHandlers {
	handleSelect: () => void;
	handleTab: () => void;
	handleEnter: () => void;
	handleUpArrow: () => void;
	handleDownArrow: () => void;
}

/**
 * Creates file autocomplete handlers
 *
 * @param deps - Dependencies for the handlers
 * @returns Object containing all file autocomplete handlers
 *
 * @example
 * ```tsx
 * const fileHandlers = useFileAutocompleteHandlers({
 *   filteredFileInfo,
 *   selectedFileIndex,
 *   input,
 *   setInput,
 *   setCursor,
 *   setSelectedFileIndex,
 *   addAttachment,
 * });
 *
 * // Use handlers
 * fileHandlers.handleSelect();
 * ```
 */
export function useFileAutocompleteHandlers(
	deps: FileAutocompleteHandlersDeps,
): FileAutocompleteHandlers {
	const {
		filteredFileInfo,
		selectedFileIndex,
		input,
		setInput,
		setCursor,
		setSelectedFileIndex,
		addAttachment,
	} = deps;

	/**
	 * Handle file selection
	 * Adds the selected file to attachments and updates the input
	 */
	const handleSelect = useCallback(() => {
		if (filteredFileInfo.files.length === 0) return;

		const selectedFile = filteredFileInfo.files[selectedFileIndex];
		if (!selectedFile) return;

		// Add file to attachments
		addAttachment({
			path: selectedFile.path,
			relativePath: selectedFile.relativePath,
			size: selectedFile.size,
		});

		// Replace @query with @relativePath and space
		const beforeAt = input.slice(0, filteredFileInfo.atIndex);
		const afterQuery = input.slice(
			filteredFileInfo.atIndex + 1 + filteredFileInfo.query.length,
		);
		const newInput = `${beforeAt}@${selectedFile.relativePath} ${afterQuery}`;

		setInput(newInput);
		setCursor(filteredFileInfo.atIndex + 1 + selectedFile.relativePath.length + 1);
		setSelectedFileIndex(0);
	}, [
		filteredFileInfo,
		selectedFileIndex,
		input,
		setInput,
		setCursor,
		setSelectedFileIndex,
		addAttachment,
	]);

	/**
	 * Handle Tab key - selects current file
	 */
	const handleTab = useCallback(() => {
		handleSelect();
	}, [handleSelect]);

	/**
	 * Handle Enter key - selects current file
	 */
	const handleEnter = useCallback(() => {
		handleSelect();
	}, [handleSelect]);

	/**
	 * Handle Up Arrow - navigate to previous file
	 */
	const handleUpArrow = useCallback(() => {
		if (filteredFileInfo.files.length === 0) return;
		setSelectedFileIndex((prev) =>
			prev === 0 ? filteredFileInfo.files.length - 1 : prev - 1,
		);
	}, [filteredFileInfo.files.length, setSelectedFileIndex]);

	/**
	 * Handle Down Arrow - navigate to next file
	 */
	const handleDownArrow = useCallback(() => {
		if (filteredFileInfo.files.length === 0) return;
		setSelectedFileIndex((prev) =>
			prev === filteredFileInfo.files.length - 1 ? 0 : prev + 1,
		);
	}, [filteredFileInfo.files.length, setSelectedFileIndex]);

	return {
		handleSelect,
		handleTab,
		handleEnter,
		handleUpArrow,
		handleDownArrow,
	};
}
