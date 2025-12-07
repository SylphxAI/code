/**
 * Server-side Ask Tool
 * Replaces client-side ask tool with server-managed queue
 */
import type { Observer } from "@trpc/server/observable";
import type { StreamEvent } from "./types.js";
/**
 * Create server-side ask tool with session context
 * This replaces the client-side ask tool in code-core
 */
export declare function createAskTool(sessionId: string, observer: Observer<StreamEvent, unknown>): import("ai").Tool<{
    question: string;
    options: {
        label: string;
        value?: string | undefined;
        freeText?: boolean | undefined;
        placeholder?: string | undefined;
        checked?: boolean | undefined;
    }[];
    multiSelect?: boolean | undefined;
    preSelected?: string[] | undefined;
}, string>;
//# sourceMappingURL=ask-tool.d.ts.map