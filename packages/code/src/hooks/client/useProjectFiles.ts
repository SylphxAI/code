/**
 * Project Files Hook
 * Loads project files on mount for @file auto-completion using Zen signals
 */

import { useEffect } from "react";
import {
	useLensClient,
	useProjectFiles as useProjectFilesSignal,
	useFilesLoading,
	setProjectFiles as setProjectFilesSignal,
	setFilesLoading as setFilesLoadingSignal,
} from "@sylphx/code-client";

export function useProjectFiles() {
	const client = useLensClient();
	const projectFiles = useProjectFilesSignal();
	const filesLoading = useFilesLoading();

	useEffect(() => {
		const loadFiles = async () => {
			setFilesLoadingSignal(true);
			try {
				// Lens flat namespace: client.scanProjectFiles()
				const result = await client.scanProjectFiles.fetch({}) as { files: any[] };
				setProjectFilesSignal(result.files);
			} catch (error) {
				console.error("Failed to load project files:", error);
			} finally {
				setFilesLoadingSignal(false);
			}
		};

		loadFiles();
	}, [client]);

	return { projectFiles, filesLoading };
}
