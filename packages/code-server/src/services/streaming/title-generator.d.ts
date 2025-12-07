/**
 * Title Generator
 * Handles parallel title generation with real-time streaming
 */
import type { AIConfig, Session, SessionRepository } from "@sylphx/code-core";
import type { AppContext } from "../../context.js";
/**
 * Title streaming callbacks for real-time updates
 */
export interface TitleStreamCallbacks {
    onStart: () => void;
    onDelta: (text: string) => void;
    onEnd: (title: string) => void;
}
/**
 * Generate session title with real-time streaming updates
 * Returns a promise that resolves when title generation is complete
 */
export declare function generateSessionTitle(appContext: AppContext, sessionRepository: SessionRepository, aiConfig: AIConfig, session: Session, userMessage: string, callbacks?: TitleStreamCallbacks): Promise<string | null>;
/**
 * Check if session needs title generation
 */
export declare function needsTitleGeneration(session: Session, isNewSession: boolean, isFirstMessage: boolean): boolean;
//# sourceMappingURL=title-generator.d.ts.map