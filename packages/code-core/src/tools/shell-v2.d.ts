/**
 * Shell Tools V2
 * Uses BashManagerV2 for active/background bash management
 */
/**
 * Execute bash command tool (V2)
 *
 * Default behavior: Active mode with timeout
 * - Blocks if active slot occupied (queues)
 * - Auto-converts to background after timeout
 * - Real-time output via event stream
 *
 * Background mode:
 * - Spawns immediately (no queueing)
 * - Runs until completion
 * - Output via event stream
 */
export declare const executeBashToolV2: import("ai").Tool<{
    command: string;
    cwd?: string | undefined;
    timeout?: number | undefined;
    run_in_background?: boolean | undefined;
}, {
    bash_id: string;
    command: string;
    mode: string;
    message: string;
    stdout?: undefined;
    stderr?: undefined;
    exitCode?: undefined;
    demoted?: undefined;
} | {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    bash_id?: undefined;
    command?: undefined;
    mode?: undefined;
    message?: undefined;
    demoted?: undefined;
} | {
    bash_id: string;
    command: string;
    mode: string;
    stdout: string;
    stderr: string;
    demoted: boolean;
    message: string;
    exitCode?: undefined;
}>;
/**
 * Get bash process status
 * Returns current state without output (use event subscription for output)
 */
export declare const getBashStatusTool: import("ai").Tool<{
    bash_id: string;
}, {
    bash_id: string;
    command: string;
    mode: import("./bash-manager-v2.js").BashMode;
    status: import("./bash-manager-v2.js").BashStatus;
    isActive: boolean;
    startTime: number;
    endTime: number | null;
    exitCode: number | null;
    cwd: string;
    duration: number;
    subscription_channel: string;
}>;
/**
 * List all bash processes
 */
export declare const listBashTool: import("ai").Tool<Record<string, never>, {
    processes: {
        id: string;
        command: string;
        mode: import("./bash-manager-v2.js").BashMode;
        status: import("./bash-manager-v2.js").BashStatus;
        isActive: boolean;
        duration: number;
        exitCode: number | null;
        cwd: string;
    }[];
    activeBashId: string | null;
    activeQueueLength: number;
    total: number;
}>;
/**
 * Kill a bash process
 */
export declare const killBashToolV2: import("ai").Tool<{
    bash_id: string;
}, {
    bash_id: string;
    status: string;
    message: string;
}>;
/**
 * Demote active bash to background (Ctrl+B equivalent)
 */
export declare const demoteBashTool: import("ai").Tool<{
    bash_id: string;
}, {
    bash_id: string;
    mode: string;
    message: string;
}>;
/**
 * All shell tools V2
 */
export declare const shellToolsV2: {
    bash: import("ai").Tool<{
        command: string;
        cwd?: string | undefined;
        timeout?: number | undefined;
        run_in_background?: boolean | undefined;
    }, {
        bash_id: string;
        command: string;
        mode: string;
        message: string;
        stdout?: undefined;
        stderr?: undefined;
        exitCode?: undefined;
        demoted?: undefined;
    } | {
        stdout: string;
        stderr: string;
        exitCode: number | null;
        bash_id?: undefined;
        command?: undefined;
        mode?: undefined;
        message?: undefined;
        demoted?: undefined;
    } | {
        bash_id: string;
        command: string;
        mode: string;
        stdout: string;
        stderr: string;
        demoted: boolean;
        message: string;
        exitCode?: undefined;
    }>;
    "bash-status": import("ai").Tool<{
        bash_id: string;
    }, {
        bash_id: string;
        command: string;
        mode: import("./bash-manager-v2.js").BashMode;
        status: import("./bash-manager-v2.js").BashStatus;
        isActive: boolean;
        startTime: number;
        endTime: number | null;
        exitCode: number | null;
        cwd: string;
        duration: number;
        subscription_channel: string;
    }>;
    "bash-list": import("ai").Tool<Record<string, never>, {
        processes: {
            id: string;
            command: string;
            mode: import("./bash-manager-v2.js").BashMode;
            status: import("./bash-manager-v2.js").BashStatus;
            isActive: boolean;
            duration: number;
            exitCode: number | null;
            cwd: string;
        }[];
        activeBashId: string | null;
        activeQueueLength: number;
        total: number;
    }>;
    "kill-bash": import("ai").Tool<{
        bash_id: string;
    }, {
        bash_id: string;
        status: string;
        message: string;
    }>;
    "demote-bash": import("ai").Tool<{
        bash_id: string;
    }, {
        bash_id: string;
        mode: string;
        message: string;
    }>;
};
//# sourceMappingURL=shell-v2.d.ts.map