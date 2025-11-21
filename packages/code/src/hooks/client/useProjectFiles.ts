/**
 * Project Files Hook
 * Loads project files on mount for @file auto-completion using Zen signals
 */

import { useEffect } from "react";
import {
	getTRPCClient,
	useProjectFiles as useProjectFilesSignal,
	useFilesLoading,
	setProjectFiles as setProjectFilesSignal,
	setFilesLoading as setFilesLoadingSignal,
} from "@sylphx/code-client";

export function useProjectFiles() {
	const projectFiles = useProjectFilesSignal();
	const filesLoading = useFilesLoading();

	useEffect(() => {
		const loadFiles = async () => {
			setFilesLoadingSignal(true);
			try {
				const client = getTRPCClient();
				const result = await client.config.scanProjectFiles.query({});
				setProjectFilesSignal(result.files);
			} catch (error) {
				console.error("Failed to load project files:", error);
			} finally {
				setFilesLoadingSignal(false);
			}
		};

		loadFiles();
	}, []);

	return { projectFiles, filesLoading };
}
