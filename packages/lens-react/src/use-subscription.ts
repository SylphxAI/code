/**
 * useSubscription hook for Lens
 */

import type { LensRequest, FieldSelection, UpdateMode } from "@sylphx/lens-core";
import { useEffect, useState } from "react";
import { useLensContext } from "./provider.js";

export interface UseSubscriptionOptions<TData> {
	/** Enable/disable the subscription */
	enabled?: boolean;
	/** Callback on data update */
	onData?: (data: TData) => void;
	/** Callback on error */
	onError?: (error: Error) => void;
	/** Callback on complete */
	onComplete?: () => void;
	/** Field selection - control which fields to fetch */
	select?: FieldSelection;
	/** Update mode - minimize transmission (delta, patch, value, auto) */
	updateMode?: UpdateMode;
}

export interface UseSubscriptionResult<TData> {
	data: TData | undefined;
	error: Error | null;
	isConnected: boolean;
	isError: boolean;
}

/**
 * Hook for real-time subscriptions with update strategies
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { data, isConnected } = useSubscription({
 *   type: 'subscription',
 *   path: ['user', 'get'],
 *   input: { id: '123' }
 * }, {
 *   onData: (data) => console.log('Update:', data)
 * });
 *
 * // With patch strategy for minimal transmission
 * const { data } = useSubscription({
 *   type: 'subscription',
 *   path: ['session', 'getById'],
 *   input: { sessionId: 'abc' }
 * }, {
 *   select: ['id', 'title', 'updatedAt'],
 *   updateMode: 'patch' // Only send JSON Patch
 * });
 *
 * // With delta strategy for text streaming
 * const { data } = useSubscription({
 *   type: 'subscription',
 *   path: ['message', 'streamResponse'],
 *   input: { sessionId: 'abc', content: 'Hello' }
 * }, {
 *   updateMode: 'delta' // Only send text differences
 * });
 * ```
 */
export function useSubscription<TData>(
	request: LensRequest,
	options: UseSubscriptionOptions<TData> = {},
): UseSubscriptionResult<TData> {
	const { transport } = useLensContext();
	const [data, setData] = useState<TData | undefined>(undefined);
	const [error, setError] = useState<Error | null>(null);
	const [isConnected, setIsConnected] = useState(false);

	useEffect(() => {
		if (options.enabled === false) {
			return;
		}

		const observable = transport.subscribe<TData>({
			...request,
			select: options.select,
			updateMode: options.updateMode
		});
		setIsConnected(true);

		const subscription = observable.subscribe({
			next: (value: TData) => {
				setData(value);
				options.onData?.(value);
			},
			error: (err: Error) => {
				setError(err);
				setIsConnected(false);
				options.onError?.(err);
			},
			complete: () => {
				setIsConnected(false);
				options.onComplete?.();
			},
		});

		return () => {
			subscription.unsubscribe();
			setIsConnected(false);
		};
	}, [
		JSON.stringify(request),
		options.enabled,
		JSON.stringify(options.select),
		options.updateMode,
	]);

	return {
		data,
		error,
		isConnected,
		isError: error !== null,
	};
}
