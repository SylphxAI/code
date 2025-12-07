/**
 * MCP Types
 * Model Context Protocol integration types
 *
 * Based on AI SDK MCP documentation
 */
/**
 * MCP Server Transport Types
 */
export type MCPTransportType = "http" | "sse" | "stdio";
/**
 * HTTP Transport Configuration
 * Recommended for production
 */
export interface MCPTransportHTTP {
    type: "http";
    url: string;
    headers?: Record<string, string>;
}
/**
 * SSE Transport Configuration
 * Alternative HTTP-based transport
 */
export interface MCPTransportSSE {
    type: "sse";
    url: string;
    headers?: Record<string, string>;
}
/**
 * Stdio Transport Configuration
 * For local development only (cannot be deployed)
 */
export interface MCPTransportStdio {
    type: "stdio";
    command: string;
    args?: string[];
    env?: Record<string, string>;
}
/**
 * Union of all transport types
 */
export type MCPTransport = MCPTransportHTTP | MCPTransportSSE | MCPTransportStdio;
/**
 * MCP Server Configuration
 * User-defined server config stored in .sylphx-code/mcp-servers.json
 */
export interface MCPServerConfig {
    /** Display name */
    name?: string;
    /** Description */
    description?: string;
    /** Transport configuration */
    transport: MCPTransport;
    /** Whether server is enabled (defaults to true) */
    enabled?: boolean;
    /** Tags for organization */
    tags?: string[];
    /** Custom metadata */
    metadata?: Record<string, unknown>;
}
/**
 * MCP Server Status
 */
export type MCPServerStatus = "connected" | "disconnected" | "connecting" | "error";
/**
 * MCP Server Runtime State
 * Combines config with runtime information
 */
export interface MCPServerState {
    /** Server configuration */
    config: MCPServerConfig;
    /** Current connection status */
    status: MCPServerStatus;
    /** Error message if status is 'error' */
    error?: string;
    /** Number of tools provided */
    toolCount: number;
    /** Number of resources provided */
    resourceCount: number;
    /** Number of prompts provided */
    promptCount: number;
    /** When connection was established */
    connectedAt?: number;
    /** Last activity timestamp */
    lastActivity?: number;
}
/**
 * MCP Tool Information
 * Tool provided by an MCP server
 */
export interface MCPToolInfo {
    /** Server ID that provides this tool */
    serverId: string;
    /** Tool name */
    name: string;
    /** Tool description */
    description: string;
    /** Input schema (JSON Schema) */
    inputSchema: Record<string, unknown>;
}
/**
 * MCP Resource Information
 * Resource provided by an MCP server
 */
export interface MCPResourceInfo {
    /** Server ID that provides this resource */
    serverId: string;
    /** Resource URI */
    uri: string;
    /** Resource name */
    name: string;
    /** Description */
    description?: string;
    /** MIME type */
    mimeType?: string;
}
/**
 * MCP Prompt Information
 * Prompt template provided by an MCP server
 */
export interface MCPPromptInfo {
    /** Server ID that provides this prompt */
    serverId: string;
    /** Prompt name */
    name: string;
    /** Description */
    description?: string;
    /** Prompt arguments */
    arguments?: Array<{
        name: string;
        description?: string;
        required?: boolean;
    }>;
}
/**
 * MCP Servers Configuration File
 * Stored in .sylphx-code/mcp-servers.json
 *
 * Format matches Claude Desktop and industry standards:
 * {
 *   "mcpServers": {
 *     "server-id": { ...config },
 *     "another-server": { ...config }
 *   }
 * }
 */
export interface MCPServersConfig {
    /** Configured servers (keyed by server ID) */
    mcpServers: Record<string, MCPServerConfig>;
}
/**
 * MCP Server with ID
 * Helper type for when we need both the ID and config
 */
export interface MCPServerWithId extends MCPServerConfig {
    id: string;
}
//# sourceMappingURL=mcp.types.d.ts.map