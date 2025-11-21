/**
 * Command State Hook
 * Manages command menu, pending commands, selection state, and custom input components using Zen signals
 */

import {
	useCtrlPressed,
	setCtrlPressed as setCtrlPressedSignal,
	useShowCommandMenu,
	setShowCommandMenu as setShowCommandMenuSignal,
	useSelectedCommandIndex,
	setSelectedCommandIndex as setSelectedCommandIndexSignal,
	usePendingCommand,
	setPendingCommand as setPendingCommandSignal,
	useShowEscHint,
	setShowEscHint as setShowEscHintSignal,
	useSelectedFileIndex,
	setSelectedFileIndex as setSelectedFileIndexSignal,
	useCachedOptions,
	setCachedOptions as setCachedOptionsSignal,
	useCurrentlyLoading,
	setCurrentlyLoading as setCurrentlyLoadingSignal,
	useLoadError,
	setLoadError as setLoadErrorSignal,
	useInputComponent,
	useInputComponentTitle,
	setInputComponent as setInputComponentSignal,
	type Command,
} from "@sylphx/code-client";
import type { ReactNode } from "react";
import { useRef } from "react";

export interface CommandState {
	ctrlPressed: boolean;
	setCtrlPressed: (pressed: boolean) => void;
	showCommandMenu: boolean;
	setShowCommandMenu: (show: boolean) => void;
	selectedCommandIndex: number;
	setSelectedCommandIndex: (index: number) => void;
	pendingCommand: { command: Command; currentInput: string } | null;
	setPendingCommand: (command: { command: Command; currentInput: string } | null) => void;
	skipNextSubmit: React.MutableRefObject<boolean>;
	lastEscapeTime: React.MutableRefObject<number>;
	showEscHint: boolean;
	setShowEscHint: (show: boolean) => void;
	selectedFileIndex: number;
	setSelectedFileIndex: (index: number) => void;
	cachedOptions: Map<string, Array<{ id: string; name: string; label: string; value?: string }>>;
	setCachedOptions: (options: Map<string, Array<{ id: string; name: string; label: string; value?: string }>>) => void;
	currentlyLoading: string | null;
	setCurrentlyLoading: (loading: string | null) => void;
	loadError: string | null;
	setLoadError: (error: string | null) => void;
	commandSessionRef: React.MutableRefObject<string | null>;
	inputComponent: ReactNode | null;
	setInputComponent: (component: ReactNode | null, title?: string) => void;
	inputComponentTitle: string | null;
}

export function useCommandState(): CommandState {
	const ctrlPressed = useCtrlPressed();
	const showCommandMenu = useShowCommandMenu();
	const selectedCommandIndex = useSelectedCommandIndex();
	const pendingCommand = usePendingCommand();
	const showEscHint = useShowEscHint();
	const selectedFileIndex = useSelectedFileIndex();
	const cachedOptions = useCachedOptions();
	const currentlyLoading = useCurrentlyLoading();
	const loadError = useLoadError();
	const inputComponent = useInputComponent();
	const inputComponentTitle = useInputComponentTitle();

	// Refs are not migrated to signals (they're React-specific and don't need reactivity)
	const skipNextSubmit = useRef(false);
	const lastEscapeTime = useRef<number>(0);
	const commandSessionRef = useRef<string | null>(null);

	return {
		ctrlPressed,
		setCtrlPressed: setCtrlPressedSignal,
		showCommandMenu,
		setShowCommandMenu: setShowCommandMenuSignal,
		selectedCommandIndex,
		setSelectedCommandIndex: setSelectedCommandIndexSignal,
		pendingCommand,
		setPendingCommand: setPendingCommandSignal,
		skipNextSubmit,
		lastEscapeTime,
		showEscHint,
		setShowEscHint: setShowEscHintSignal,
		selectedFileIndex,
		setSelectedFileIndex: setSelectedFileIndexSignal,
		cachedOptions,
		setCachedOptions: setCachedOptionsSignal,
		currentlyLoading,
		setCurrentlyLoading: setCurrentlyLoadingSignal,
		loadError,
		setLoadError: setLoadErrorSignal,
		commandSessionRef,
		inputComponent,
		setInputComponent: setInputComponentSignal,
		inputComponentTitle,
	};
}
