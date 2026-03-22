import { exec } from 'child_process';
import { promisify } from 'util';
import { ToolDefinition, ToolExecutionContext } from '../types/index.js';

const execAsync = promisify(exec);

export const bashTool: ToolDefinition = {
  name: 'bash',
  description: 'Execute a bash command and return its output. Use for running shell commands, git operations, npm commands, etc.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The bash command to execute',
      },
    },
    required: ['command'],
  },
  async execute(input: Record<string, unknown>, context: ToolExecutionContext) {
    const command = input.command as string;
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: context.workingDirectory,
        timeout: 60000,
      });
      return { content: stdout + stderr };
    } catch (error: unknown) {
      const err = error as { message?: string; stdout?: string; stderr?: string };
      return {
        content: err.stdout || err.stderr || err.message || 'Command failed',
        is_error: true,
      };
    }
  },
};