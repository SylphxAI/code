#!/usr/bin/env node
/**
 * Replace console.log statements with proper logging utility
 *
 * Strategy:
 * 1. console.error() → logger.error()
 * 2. console.warn() → logger.warn()
 * 3. console.log() → logger.info() or logger.debug() based on context
 * 4. console.debug() → logger.debug()
 * 5. Add logger import if missing
 */

import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';
import path from 'path';

const PACKAGES = [
  'packages/code-core/src',
  'packages/code-server/src',
  'packages/code/src'
];

// Files to skip (utilities that already use proper logging or are test files)
const SKIP_FILES = [
  'utils/logger.ts',
  'utils/debug-logger.ts',
  'utils/console-ui.ts',
  'utils/cli-output.ts',
  'utils/help.ts',
  'utils/memory-tui.ts',
  'utils/test-audio.ts',
  '.test.ts',
  '.test.tsx',
  'storage/README.md'
];

function shouldSkipFile(filePath) {
  return SKIP_FILES.some(skip => filePath.includes(skip));
}

function determineLogLevel(context) {
  const lowerContext = context.toLowerCase();

  // Error indicators
  if (lowerContext.includes('error') || lowerContext.includes('failed') ||
      lowerContext.includes('fail')) {
    return 'error';
  }

  // Warning indicators
  if (lowerContext.includes('warn') || lowerContext.includes('deprecated') ||
      lowerContext.includes('migration')) {
    return 'warn';
  }

  // Debug indicators
  if (lowerContext.includes('debug') || lowerContext.includes('[') ||
      lowerContext.includes('starting') || lowerContext.includes('processing')) {
    return 'debug';
  }

  // Default to info
  return 'info';
}

function extractMessageAndMeta(args) {
  // Handle various console.log patterns
  const cleanArgs = args.trim();

  // Pattern 1: console.error("message", error)
  const errorPattern = /^["']([^"']+)["']\s*,\s*(\w+)\s*$/;
  const errorMatch = cleanArgs.match(errorPattern);
  if (errorMatch) {
    return {
      message: errorMatch[1],
      hasError: true,
      errorVar: errorMatch[2]
    };
  }

  // Pattern 2: console.log("message:", variable)
  const varPattern = /^["']([^"':]+)["'](?:\s*\+\s*|\s*,\s*)(.+)$/;
  const varMatch = cleanArgs.match(varPattern);
  if (varMatch) {
    const message = varMatch[1].replace(/:\s*$/, '');
    const variable = varMatch[2].trim();
    return {
      message,
      hasMeta: true,
      metaExpr: variable
    };
  }

  // Pattern 3: Just a message
  if (cleanArgs.startsWith('"') || cleanArgs.startsWith("'")) {
    return {
      message: cleanArgs.slice(1, -1)
    };
  }

  // Pattern 4: Template literal or complex expression
  return {
    complex: true,
    original: cleanArgs
  };
}

function replaceConsoleCall(match, method, args, offset, fullText) {
  // Determine appropriate log level
  const level = method === 'error' ? 'error' :
                method === 'warn' ? 'warn' :
                method === 'debug' ? 'debug' :
                determineLogLevel(args);

  const parsed = extractMessageAndMeta(args);

  if (parsed.complex) {
    // Keep complex expressions as-is for now
    return match;
  }

  if (parsed.hasError && level === 'error') {
    return `logger.error("${parsed.message}", ${parsed.errorVar})`;
  }

  if (parsed.hasMeta) {
    // Convert to structured logging
    const metaKey = parsed.message.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+$/, '');
    return `logger.${level}("${parsed.message}", { ${metaKey}: ${parsed.metaExpr} })`;
  }

  return `logger.${level}("${parsed.message}")`;
}

function addLoggerImport(content, packageName) {
  // Check if logger is already imported
  if (content.includes('from "../utils/logger')) {
    return content;
  }
  if (content.includes('from "../../utils/logger')) {
    return content;
  }
  if (content.includes('from "@sylphx/code-core"') && content.includes('logger')) {
    return content;
  }

  // Find the last import statement
  const imports = content.match(/^import\s+.+from\s+['"]. +['"];?$/gm);
  if (!imports || imports.length === 0) {
    return content;
  }

  const lastImport = imports[imports.length - 1];
  const lastImportIndex = content.lastIndexOf(lastImport);
  const insertIndex = lastImportIndex + lastImport.length;

  // Determine relative path to logger
  let loggerImport;
  if (packageName === 'code-core') {
    loggerImport = '\nimport { logger } from "../utils/logger.js";';
  } else {
    loggerImport = '\nimport { logger } from "@sylphx/code-core";';
  }

  return content.slice(0, insertIndex) + loggerImport + content.slice(insertIndex);
}

function processFile(filePath, packageName) {
  try {
    let content = readFileSync(filePath, 'utf8');
    const original = content;

    // Skip if no console statements
    if (!content.match(/console\.(log|error|warn|debug|info)/)) {
      return { processed: false };
    }

    // Replace console statements
    // Pattern: console.error(...), console.warn(...), etc.
    content = content.replace(
      /console\.(error|warn|log|debug|info)\(([^)]+)\)/g,
      replaceConsoleCall
    );

    // Add logger import if we made changes and it's not already there
    if (content !== original) {
      content = addLoggerImport(content, packageName);
      writeFileSync(filePath, content, 'utf8');
      return { processed: true, changed: true };
    }

    return { processed: true, changed: false };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return { processed: false, error: error.message };
  }
}

function main() {
  console.log('Starting console.* replacement...\n');

  let totalFiles = 0;
  let processedFiles = 0;
  let changedFiles = 0;
  let skippedFiles = 0;

  for (const pkg of PACKAGES) {
    const packageName = pkg.split('/')[1];  // Extract 'code-core', 'code-server', or 'code'
    const pattern = `${pkg}/**/*.{ts,tsx}`;
    const files = globSync(pattern, { ignore: ['**/*.d.ts', '**/node_modules/**'] });

    console.log(`\nProcessing ${packageName}: ${files.length} files`);

    for (const file of files) {
      totalFiles++;

      if (shouldSkipFile(file)) {
        skippedFiles++;
        continue;
      }

      const result = processFile(file, packageName);

      if (result.processed) {
        processedFiles++;
        if (result.changed) {
          changedFiles++;
          console.log(`  ✓ ${path.relative(process.cwd(), file)}`);
        }
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Summary:`);
  console.log(`  Total files: ${totalFiles}`);
  console.log(`  Processed: ${processedFiles}`);
  console.log(`  Changed: ${changedFiles}`);
  console.log(`  Skipped: ${skippedFiles}`);
  console.log(`${'='.repeat(60)}\n`);
}

main();
