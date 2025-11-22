/**
 * useQuery hook for Lens
 */

import type { LensRequest, FieldSelection } from "@sylphx/lens-core";
import { useEffect, useState } from "react";
import { useLensContext } from "./provider.js";

export interface UseQueryOptions<TData> {
	/** Enable/disable the query */
	enabled?: boolean;
	/** Refetch interval in milliseconds */
	refetchInterval?: number;
	/** Initial data */
	initialData?: TData;
	/** Callback on success */
	onSuccess?: (data: TData) => void;
	/** Callback on error */
	onError?: (error: Error) => void;
	/** Field selection - control which fields to fetch */
	select?: FieldSelection;
}

export interface UseQueryResult<TData> {
	data: TData | undefined;
	error: Error | null;
	isLoading: boolean;
	isError: boolean;
	isSuccess: boolean;
	refetch: () => Promise<void>;
}

/**
 * Hook for executing queries with caching
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { data, isLoading, error, refetch } = useQuery({
 *   type: 'query',
 *   path: ['user', 'get'],
 *   input: { id: '123' }
 * });
 *
 * // With field selection
 * const { data } = useQuery({
 *   type: 'query',
 *   path: ['user', 'get'],
 *   input: { id: '123' }
 * }, {
 *   select: ['id', 'name', 'email']
 * });
 * ```
 */
export function useQuery<TData>(
	request: LensRequest,
	options: UseQueryOptions<TData> = {},
): UseQueryResult<TData> {
	const { transport, cache } = useLensContext();
	const [data, setData] = useState<TData | undefined>(options.initialData);
	const [error, setError] = useState<Error | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const fetchData = async () => {
		const cacheKey = `query:${request.path.join(".")}:${JSON.stringify(request.input)}`;

		// Check cache first
		if (cache) {
			const cached = cache.get(cacheKey);
			if (cached !== undefined) {
				setData(cached);
				setIsLoading(false);
				options.onSuccess?.(cached);
				return;
			}
		}

		try {
			setIsLoading(true);
			setError(null);

			const result = await transport.query<TData>({
				...request,
				select: options.select
			});

			// Cache result
			if (cache) {
				cache.set(cacheKey, result);
			}

			setData(result);
			options.onSuccess?.(result);
		} catch (err) {
			const error = err instanceof Error ? err : new Error(String(err));
			setError(error);
			options.onError?.(error);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (options.enabled === false) {
			return;
		}

		fetchData();

		if (options.refetchInterval) {
			const interval = setInterval(fetchData, options.refetchInterval);
			return () => clearInterval(interval);
		}
	}, [
		JSON.stringify(request),
		options.enabled,
		options.refetchInterval,
		JSON.stringify(options.select),
	]);

	return {
		data,
		error,
		isLoading,
		isError: error !== null,
		isSuccess: data !== undefined && error === null,
		refetch: fetchData,
	};
}
