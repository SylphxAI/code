/**
 * Project Files Domain Signals
 * Manages project file list for @file auto-completion
 */

import { zen } from "@sylphx/zen";
import { useZen } from "../../react-bridge.js";

export interface ProjectFile {
	path: string;
	relativePath: string;
	size: number;
}

// Core project files signals
export const projectFiles = zen<ProjectFile[]>([]);
export const filesLoading = zen<boolean>(false);

// React hooks
export function useProjectFiles(): ProjectFile[] {
	return useZen(projectFiles);
}

export function useFilesLoading(): boolean {
	return useZen(filesLoading);
}

// Actions
export function setProjectFiles(files: ProjectFile[]): void {
	projectFiles.value = files;
}

export function setFilesLoading(loading: boolean): void {
	filesLoading.value = loading;
}

// Getters (for non-React code)
export function getProjectFiles(): ProjectFile[] {
	return projectFiles.value;
}
