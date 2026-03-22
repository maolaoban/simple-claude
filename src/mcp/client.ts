import { spawn, ChildProcess } from 'child_process';
import { MCPServerConfig, MCPListToolsResult, MCPTool } from '../types/index.js';

export class MCPClient {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  private tools: MCPTool[] = [];

  async connect(config: MCPServerConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      this.process = spawn(config.command, config.args || [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...config.env },
      });

      let buffer = '';

      this.process.stdout?.on('data', (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            this.handleMessage(line);
          }
        }
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        console.error('[MCP stderr]:', data.toString());
      });

      this.process.on('error', reject);
      this.process.on('close', () => {
        this.process = null;
      });

      // Initialize and wait for tools
      this.initialize().then(() => resolve()).catch(reject);
    });
  }

  private async initialize(): Promise<void> {
    const result = await this.callMethod('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'simple-claude', version: '1.0.0' },
    });

    // Send initialized notification
    this.sendNotification('initialized', {});

    // List tools
    const toolsResult = await this.listTools();
    this.tools = toolsResult.tools;
  }

  private async listTools(): Promise<MCPListToolsResult> {
    return this.callMethod('tools/list', {}) as Promise<MCPListToolsResult>;
  }

  private callMethod(method: string, params: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      this.pendingRequests.set(id, { resolve, reject });

      const message = JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params,
      });

      this.process?.stdin?.write(message + '\n');

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request ${id} timeout`));
        }
      }, 30000);
    });
  }

  private sendNotification(method: string, params: Record<string, unknown>): void {
    const message = JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
    });
    this.process?.stdin?.write(message + '\n');
  }

  private handleMessage(data: string): void {
    try {
      const msg = JSON.parse(data);
      if (msg.id && this.pendingRequests.has(msg.id)) {
        const { resolve, reject } = this.pendingRequests.get(msg.id)!;
        this.pendingRequests.delete(msg.id);

        if (msg.error) {
          reject(new Error(msg.error.message || 'MCP error'));
        } else {
          resolve(msg.result);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  getTools(): MCPTool[] {
    return this.tools;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<{ content: string; is_error?: boolean }> {
    try {
      const result = await this.callMethod('tools/call', { name, arguments: args });
      return { content: JSON.stringify(result) };
    } catch (error: unknown) {
      const err = error as { message?: string };
      return { content: err.message || 'Tool call failed', is_error: true };
    }
  }

  disconnect(): void {
    this.process?.kill();
    this.process = null;
    this.tools = [];
  }
}