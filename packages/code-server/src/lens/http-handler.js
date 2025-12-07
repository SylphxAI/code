/**
 * Lens HTTP Handler
 *
 * Custom HTTP handler for Lens API with AppContext injection
 * Wraps our pre-bound Lens API from lens/index.ts
 */
/**
 * Create HTTP handler for Lens API
 *
 * Handles POST requests with JSON body containing Lens requests
 *
 * @example
 * Request body:
 * ```json
 * {
 *   "type": "query",
 *   "path": ["Session", "get", "query"],
 *   "input": { "id": "session-123" }
 * }
 * ```
 */
export function createLensHTTPHandler(lensAPI) {
    return async (req, res) => {
        try {
            // Parse request body
            const lensRequest = req.body;
            console.log("[Lens HTTP] Request:", JSON.stringify(lensRequest));
            if (!lensRequest.type || !lensRequest.path || !Array.isArray(lensRequest.path)) {
                res.status(400).json({
                    error: {
                        message: "Invalid request: missing type or path",
                        code: "INVALID_REQUEST",
                    },
                });
                return;
            }
            // Resolve endpoint from path
            const endpoint = resolvePath(lensAPI, lensRequest.path);
            console.log("[Lens HTTP] Endpoint resolved:", {
                path: lensRequest.path,
                endpointType: typeof endpoint,
                isFunction: typeof endpoint === "function",
            });
            if (!endpoint || typeof endpoint !== "function") {
                res.status(404).json({
                    error: {
                        message: `Endpoint not found: ${lensRequest.path.join(".")}`,
                        code: "NOT_FOUND",
                    },
                });
                return;
            }
            // Execute endpoint (context is already bound in lensAPI)
            const result = await endpoint(lensRequest.input);
            console.log("[Lens HTTP] Result:", typeof result, result ? Object.keys(result).length : "null/undefined");
            // Send response
            res.status(200).json({
                data: result,
            });
        }
        catch (error) {
            console.error("[Lens HTTP Handler] Error:", error);
            res.status(error.statusCode || 500).json({
                error: {
                    message: error.message || "Internal server error",
                    code: error.code || "INTERNAL_ERROR",
                },
            });
        }
    };
}
/**
 * Resolve endpoint from path in Lens API
 *
 * Example paths:
 * - ["Session", "get", "query"]
 * - ["Session", "create", "mutate"]
 * - ["Session", "getLast"]
 */
function resolvePath(api, path) {
    let current = api;
    for (const segment of path) {
        if (!current || typeof current !== "object") {
            return null;
        }
        current = current[segment];
    }
    return current;
}
//# sourceMappingURL=http-handler.js.map