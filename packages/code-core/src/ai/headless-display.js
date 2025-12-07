/**
 * Headless Display
 * Formatting and display logic for headless mode (non-TUI)
 */
import chalk from "chalk";
/**
 * Format tool input for display
 */
function formatInput(input) {
    if (!input || typeof input !== "object") {
        return "";
    }
    const inputStr = Object.keys(input).length === 0 ? "" : JSON.stringify(input, null, 2);
    if (!inputStr) {
        return "";
    }
    const lines = inputStr.split("\n");
    const truncated = lines.length > 5
        ? lines.slice(0, 5).join("\n") + chalk.dim(`\n     … +${lines.length - 5} lines`)
        : inputStr;
    return truncated;
}
/**
 * Format tool result for display
 */
function formatResult(result) {
    const resultStr = JSON.stringify(result, null, 2);
    const lines = resultStr.split("\n");
    const truncated = lines.length > 5
        ? lines.slice(0, 5).join("\n") + chalk.dim(`\n     … +${lines.length - 5} lines`)
        : resultStr;
    return truncated;
}
/**
 * Display callbacks for headless mode
 */
export function createHeadlessDisplay(quiet) {
    let hasOutput = false;
    return {
        onToolCall: (toolName, input) => {
            if (quiet)
                return;
            // Flush stdout to ensure proper ordering
            if (hasOutput) {
                process.stdout.write("\n");
            }
            const inputStr = formatInput(input);
            if (inputStr) {
                process.stderr.write(`\n${chalk.green("⏺")} ${chalk.bold(toolName)}\n`);
                process.stderr.write(chalk.dim(`  ⎿ ${inputStr.split("\n").join("\n     ")}\n`));
            }
            else {
                process.stderr.write(`\n${chalk.green("⏺")} ${chalk.bold(toolName)}\n`);
            }
        },
        onToolResult: (toolName, result, duration) => {
            if (quiet)
                return;
            const resultStr = formatResult(result);
            process.stderr.write(`${chalk.green("●")} ${chalk.bold(toolName)} ${chalk.dim(`(${duration}ms)`)}\n`);
            process.stderr.write(chalk.dim(`  ⎿ ${resultStr.split("\n").join("\n     ")}\n\n`));
        },
        onTextDelta: (text) => {
            if (!hasOutput) {
                hasOutput = true;
                // Add newline before first text output if we're not in quiet mode
                if (!quiet) {
                    process.stdout.write("\n");
                }
            }
            process.stdout.write(text);
        },
        onComplete: () => {
            if (hasOutput) {
                process.stdout.write("\n\n");
            }
        },
        hasOutput: () => hasOutput,
    };
}
//# sourceMappingURL=headless-display.js.map