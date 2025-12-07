/**
 * Root App Router
 * Combines all domain routers into a single tRPC router
 */
import { router } from "../trpc.js";
import { adminRouter } from "./admin.router.js";
import { bashRouter } from "./bash.router.js";
import { configRouter } from "./config.router.js";
import { eventsRouter } from "./events.router.js";
import { fileRouter } from "./file.router.js";
import { messageRouter } from "./message.router.js";
import { sessionRouter } from "./session.router.js";
import { todoRouter } from "./todo.router.js";
/**
 * Main application router
 * Namespaced by domain for clarity
 */
export const appRouter = router({
    session: sessionRouter,
    message: messageRouter,
    todo: todoRouter,
    config: configRouter,
    admin: adminRouter,
    events: eventsRouter,
    file: fileRouter,
    bash: bashRouter,
});
//# sourceMappingURL=index.js.map