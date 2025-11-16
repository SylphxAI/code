# 001. Lazy Load AI Provider SDKs

**Status:** ✅ Accepted
**Date:** 2025-11-16

## Context

Initial bundle included all AI provider SDKs (@ai-sdk/anthropic, @ai-sdk/openai, @ai-sdk/google, @openrouter/ai-sdk-provider, @ai-sdk/openai-compatible) loaded upfront, even when users only configure 1-2 providers.

## Decision

Lazy load provider SDKs via dynamic imports, loaded only when provider is used.

## Rationale

- 20-30% reduction in initial bundle size
- Faster initial load (critical for CLI startup)
- Users often configure 1-2 providers, not all 7
- SDK imports are heavy (each 50-200KB)

## Consequences

**Positive:**
- Smaller initial bundle
- Faster CLI startup time
- Reduced memory footprint

**Negative:**
- createClient now async (breaking change handled via Promise.resolve wrapper)
- First provider use has ~10ms delay for import

## References

<!-- VERIFY: packages/code-core/src/ai/providers/ -->
- Implementation: `packages/code-core/src/ai/providers/*-provider.ts`
- Base interface: `packages/code-core/src/ai/providers/base-provider.ts`
