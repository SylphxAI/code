/**
 * Session Utils
 * Explicit exports to prevent duplicate exports in bundle
 * ASSUMPTION: Only export functions used in main package index
 */

// Main exports used by code-core/src/index.ts
export { cleanAITitle, formatSessionDisplay } from "./title.js";

// NOT exported from index (used internally only):
// - generateSessionTitle, cleanTitle, truncateTitle, removeQuotes, removeTitlePrefix
// - formatRelativeTime, needsTruncation, isValidTitle, getTitleLength
// - compareTitles, extractTitleFromMessage
