/**
 * Project Files Hook
 * Loads project files for @file auto-completion
 *
 * ============================================================================
 * LENS-REACT vs ZEN SIGNALS
 * ============================================================================
 *
 * ❌ WRONG: 用 Zen signals 做 server data cache
 * ```tsx
 * const projectFiles = useProjectFilesSignal();  // Zen signal
 *
 * useEffect(() => {
 *   const data = await client.xxx.fetch({});
 *   setProjectFilesSignal(data);  // Manual sync to Zen
 * }, []);
 * ```
 *
 * ✅ CORRECT: 用 lens-react hook 直接
 * ```tsx
 * const { data: projectFiles, loading } = client.scanProjectFiles({});
 * ```
 *
 * 點解？
 * - lens-react hook 已經有 built-in cache
 * - 唔需要額外 Zen signal 去 store server data
 * - 減少 state sync bugs
 * - 減少 code complexity
 *
 * Zen signals 應該用喺:
 * - UI state (isMenuOpen, selectedIndex)
 * - User preferences (theme, language)
 * - Cross-component state (currentSessionId)
 *
 * lens-react hooks 應該用喺:
 * - Server data (sessions, providers, models)
 * - Any data from backend API
 *
 * ============================================================================
 */

import { useLensClient } from "@sylphx/code-client";

interface ProjectFile {
	path: string;
	relativePath: string;
	name: string;
	isDirectory: boolean;
}

/**
 * Hook to load project files for @file auto-completion
 *
 * @example
 * ```tsx
 * function FileSelector() {
 *   const { projectFiles, loading, error } = useProjectFiles();
 *
 *   if (loading) return <Spinner />;
 *
 *   return (
 *     <List>
 *       {projectFiles.map(f => (
 *         <ListItem key={f.path}>{f.relativePath}</ListItem>
 *       ))}
 *     </List>
 *   );
 * }
 * ```
 */
export function useProjectFiles() {
	const client = useLensClient();

	// lens-react hook: auto-fetches on mount, caches result
	// - No need for manual useEffect
	// - No need for Zen signal to store data
	// - Automatically handles loading/error state
	const { data, loading, error, refetch } = client.scanProjectFiles({}) as {
		data: { files: ProjectFile[] } | null;
		loading: boolean;
		error: Error | null;
		refetch: () => void;
	};

	return {
		projectFiles: data?.files ?? [],
		loading,
		error: error?.message ?? null,
		refetch,
	};
}
