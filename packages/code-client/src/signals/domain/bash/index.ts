/**
 * Bash Domain Signals
 * Manages bash process state
 */

import { zen } from "@sylphx/zen";
import { useZen } from "../../react-bridge.js";

// Types
export interface BashProcess {
	id: string;
	command: string;
	mode: "active" | "background";
	status: "running" | "completed" | "failed" | "killed" | "timeout";
	isActive: boolean;
	duration: number;
	exitCode: number | null;
	cwd: string;
}

// Core signals
export const backgroundBashCount = zen<number>(0);

// Process list signals
export const bashProcesses = zen<BashProcess[]>([]);
export const bashProcessesLoading = zen<boolean>(false);

// Process detail signals - keyed by bashId
export const bashProcessDetails = zen<Record<string, any>>({});
export const bashProcessOutputs = zen<Record<string, string>>({});
export const bashProcessDetailsLoading = zen<Record<string, boolean>>({});

// React hooks
export function useBackgroundBashCount(): number {
	return useZen(backgroundBashCount);
}

export function useBashProcesses(): BashProcess[] {
	return useZen(bashProcesses);
}

export function useBashProcessesLoading(): boolean {
	return useZen(bashProcessesLoading);
}

export function useBashProcessDetails(): Record<string, any> {
	return useZen(bashProcessDetails);
}

export function useBashProcessOutputs(): Record<string, string> {
	return useZen(bashProcessOutputs);
}

export function useBashProcessDetailsLoading(): Record<string, boolean> {
	return useZen(bashProcessDetailsLoading);
}

// Actions
export function setBackgroundBashCount(count: number): void {
	backgroundBashCount.value = count;
}

export function updateBackgroundBashCount(delta: number): void {
	backgroundBashCount.value = backgroundBashCount.value + delta;
}

export function setBashProcesses(processes: BashProcess[]): void {
	bashProcesses.value = processes;
}

export function setBashProcessesLoading(loading: boolean): void {
	bashProcessesLoading.value = loading;
}

export function setBashProcessDetail(bashId: string, process: any): void {
	bashProcessDetails.value = {
		...bashProcessDetails.value,
		[bashId]: process,
	};
}

export function setBashProcessOutput(bashId: string, output: string | ((prev: string) => string)): void {
	if (typeof output === "function") {
		const currentOutput = bashProcessOutputs.value[bashId] || "";
		bashProcessOutputs.value = {
			...bashProcessOutputs.value,
			[bashId]: output(currentOutput),
		};
	} else {
		bashProcessOutputs.value = {
			...bashProcessOutputs.value,
			[bashId]: output,
		};
	}
}

export function setBashProcessDetailLoading(bashId: string, loading: boolean): void {
	bashProcessDetailsLoading.value = {
		...bashProcessDetailsLoading.value,
		[bashId]: loading,
	};
}

export function clearBashProcessDetail(bashId: string): void {
	const { [bashId]: _, ...rest } = bashProcessDetails.value;
	bashProcessDetails.value = rest;

	const { [bashId]: _output, ...restOutputs } = bashProcessOutputs.value;
	bashProcessOutputs.value = restOutputs;

	const { [bashId]: _loading, ...restLoading } = bashProcessDetailsLoading.value;
	bashProcessDetailsLoading.value = restLoading;
}

// Getters for non-React code
export function getBackgroundBashCount(): number {
	return backgroundBashCount.value;
}

export function getBashProcesses(): BashProcess[] {
	return bashProcesses.value;
}

export function getBashProcessesLoading(): boolean {
	return bashProcessesLoading.value;
}

export function getBashProcessDetail(bashId: string): any {
	return bashProcessDetails.value[bashId] || null;
}

export function getBashProcessOutput(bashId: string): string {
	return bashProcessOutputs.value[bashId] || "";
}

export function getBashProcessDetailLoading(bashId: string): boolean {
	return bashProcessDetailsLoading.value[bashId] || false;
}
