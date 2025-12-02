/**
 * Streaming Domain - DEPRECATED
 *
 * LENS ARCHITECTURE:
 * All streaming state now comes from server via useQuery, NOT client signals.
 *
 * Get streaming state from session:
 *   const { data: session } = useQuery(client.getSession({ id }))
 *   const isStreaming = session?.streamingStatus === "streaming"
 *   const isTitleStreaming = session?.isTitleStreaming
 *   const title = session?.title  // Streamed via emit.delta
 *
 * This file only exports placeholder hooks that log deprecation warnings.
 * Migrate to reading directly from useQuery session data.
 */

// =============================================================================
// DEPRECATED - Use useQuery session data instead
// =============================================================================

/**
 * @deprecated Use session?.streamingStatus === "streaming" from useQuery
 */
export function useIsStreamingUI(): boolean {
	console.warn(
		"[DEPRECATED] useIsStreamingUI() - use session?.streamingStatus === 'streaming' from useQuery",
	);
	return false;
}

/**
 * @deprecated Use session?.isTitleStreaming from useQuery
 */
export function useIsTitleStreaming(): boolean {
	console.warn("[DEPRECATED] useIsTitleStreaming() - use session?.isTitleStreaming from useQuery");
	return false;
}

/**
 * @deprecated Use session?.title from useQuery
 */
export function useStreamingTitle(): string {
	console.warn("[DEPRECATED] useStreamingTitle() - use session?.title from useQuery");
	return "";
}

/**
 * @deprecated Streaming start time comes from server
 */
export function useStreamingStartTime(): number | null {
	console.warn("[DEPRECATED] useStreamingStartTime() - derive from server timestamp");
	return null;
}

/**
 * @deprecated Token counts come from session?.totalTokens via useQuery
 */
export function useStreamingOutputTokens(): number {
	console.warn("[DEPRECATED] useStreamingOutputTokens() - use session?.totalTokens from useQuery");
	return 0;
}

// =============================================================================
// DEPRECATED Actions - Server manages streaming state via emit
// =============================================================================

/**
 * @deprecated Server manages streaming state via emit
 */
export function setIsStreamingUI(_streaming: boolean): void {
	console.warn("[DEPRECATED] setIsStreamingUI() - server manages streaming state via emit");
}

/**
 * @deprecated Server manages title streaming state via emit
 */
export function setIsTitleStreaming(_streaming: boolean): void {
	console.warn("[DEPRECATED] setIsTitleStreaming() - server manages via emit");
}

/**
 * @deprecated Server manages title via emit.delta
 */
export function setStreamingTitle(_title: string | ((prev: string) => string)): void {
	console.warn("[DEPRECATED] setStreamingTitle() - server manages via emit.delta");
}

/**
 * @deprecated Server manages timing
 */
export function setStreamingStartTime(_time: number | null): void {
	console.warn("[DEPRECATED] setStreamingStartTime() - server manages timing");
}

/**
 * @deprecated Server manages token counts
 */
export function setStreamingOutputTokens(_tokens: number | ((prev: number) => number)): void {
	console.warn("[DEPRECATED] setStreamingOutputTokens() - server manages via emit");
}

/**
 * @deprecated Use session?.title from useQuery
 */
export function getStreamingTitle(): string {
	console.warn("[DEPRECATED] getStreamingTitle() - use session?.title from useQuery");
	return "";
}
