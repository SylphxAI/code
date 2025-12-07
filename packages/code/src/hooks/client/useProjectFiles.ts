/**
 * Project Files Hook
 * Loads project files for @file auto-completion
 *
 * @example
 * ```tsx
 * function FileSelector() {
 *   const { projectFiles, loading } = useProjectFiles();
 *   if (loading) return <Spinner />;
 *   return projectFiles.map(f => <Item key={f.path}>{f.relativePath}</Item>);
 * }
 * ```
 */

import { useLensClient } from "@sylphx/code-client";

interface ProjectFile {
	path: string;
	relativePath: string;
	name: string;
	isDirectory: boolean;
}

export function useProjectFiles() {
	const client = useLensClient();

	const { data, loading, error, refetch } = client.scanProjectFiles.useQuery({}) as {
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
