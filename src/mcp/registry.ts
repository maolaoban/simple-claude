import { MCPClient } from './client.js';
import { MCPServerConfig, MCPTool, Tool } from '../types/index.js';

export class MCPRegistry {
  private clients: Map<string, MCPClient> = new Map();

  async addServer(name: string, config: MCPServerConfig): Promise<void> {
    const client = new MCPClient();
    await client.connect(config);
    this.clients.set(name, client);
  }

  getTools(): Tool[] {
    const tools: Tool[] = [];
    for (const [serverName, client] of this.clients) {
      for (const tool of client.getTools()) {
        tools.push({
          name: `${serverName}_${tool.name}`,
          description: `[MCP:${serverName}] ${tool.description}`,
          input_schema: tool.inputSchema as Tool['input_schema'],
        });
      }
    }
    return tools;
  }

  async executeTool(name: string, input: Record<string, unknown>): Promise<{ content: string; is_error?: boolean }> {
    const [serverName, toolName] = name.split('_', 2);
    const client = this.clients.get(serverName);

    if (!client) {
      return { content: `MCP server not found: ${serverName}`, is_error: true };
    }

    return client.callTool(toolName, input);
  }

  disconnect(): void {
    for (const client of this.clients.values()) {
      client.disconnect();
    }
    this.clients.clear();
  }
}