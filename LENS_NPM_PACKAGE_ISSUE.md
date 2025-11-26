# Lens NPM Package Issue - React Bundling

## ✅ RESOLVED in @sylphx/lens-react@1.0.5

The React bundling issue has been fixed in version 1.0.5. React is now imported as an external dependency instead of being bundled.

**Fixed Versions:**
- ✅ @sylphx/lens-react@1.0.5 - React imports correctly
- ✅ @sylphx/lens-client@1.0.4 - Working correctly
- ✅ @sylphx/lens@1.0.4 - Working correctly

---

## Problem (Historical - Fixed in 1.0.5)
`@sylphx/lens-react@1.0.3` bundles React 18.3.1 into `dist/index.js` instead of treating it as an external dependency. This causes "Invalid hook call" errors when used with React 19.2.0 projects.

## Root Cause
The build script in `@sylphx/lens-react/package.json`:
```json
"build": "bun build ./src/index.ts --outdir ./dist --target browser && bun run build:types"
```

Missing `--external react` flag, causing React to be bundled into the output.

## Evidence
```bash
$ head -100 node_modules/@sylphx/lens-react/dist/index.js | grep -i react
# Shows bundled React 18.3.1:
# var ReactVersion = "18.3.1";
# // ../../node_modules/.bun/react@18.3.1/node_modules/react/cjs/react.development.js
```

## Impact
- React version mismatch causes hook errors
- Multiple React instances in runtime
- Breaks all components using `useQuery`, `useMutation`, `useLazyQuery`

## Workaround (Current)
1. **Manual patch** to `node_modules/@sylphx/lens-react/package.json`:
   ```json
   "exports": {
     ".": {
       "import": "./dist/index.js",
       "types": "./dist/index.d.ts"
     },
     "./src/*": "./src/*"  // ← Add this line
   }
   ```

2. **Import from source** in `packages/code-client/src/index.ts`:
   ```typescript
   export { useQuery, useMutation, useLazyQuery } from "@sylphx/lens-react/src/index.ts";
   ```

**IMPORTANT**: This patch is lost on every `bun install` and must be reapplied manually.

## Permanent Fix
Republish `@sylphx/lens-react` with corrected build script:

```json
"build": "bun build ./src/index.ts --outdir ./dist --target browser --external react && bun run build:types"
```

## Testing After Fix
```bash
# 1. Clean install
rm -rf node_modules bun.lock
bun install

# 2. Verify React is NOT bundled
head -100 node_modules/@sylphx/lens-react/dist/index.js | grep -i react
# Should return NO results

# 3. Revert workaround
# Change import back to:
export { useQuery, useMutation, useLazyQuery } from "@sylphx/lens-react";

# 4. Test TUI
bun dev:code
# Should run without "Invalid hook call" errors
```

## Affected Versions
- ❌ `@sylphx/lens-react@1.1.2` - Has workspace dependency issues
- ❌ `@sylphx/lens-react@1.0.3` - Bundles React 18.3.1 (current)
- ✅ Next version - Should fix bundling issue

## Related Files
- `/Users/kyle/code/packages/code-client/src/index.ts` - Workaround import
- `/Users/kyle/code/node_modules/.bun/@sylphx+lens-react@1.0.3+31790def53366975/node_modules/@sylphx/lens-react/package.json` - Manual patch location
