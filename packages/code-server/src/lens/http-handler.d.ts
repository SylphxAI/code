/**
 * Lens HTTP Handler
 *
 * Custom HTTP handler for Lens API with AppContext injection
 * Wraps our pre-bound Lens API from lens/index.ts
 */
import type { Request, Response } from "express";
import type { LensAPI } from "./index.js";
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
export declare function createLensHTTPHandler(lensAPI: LensAPI): (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=http-handler.d.ts.map