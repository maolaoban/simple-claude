import { ToolDefinition, Tool, ToolExecutionContext } from '../types/index.js';
import { bashTool } from './bash.js';
import { readTool } from './read.js';
import { writeTool } from './write.js';
import { globTool } from './glob.js';

export const builtInTools: ToolDefinition[] = [bashTool, readTool, writeTool, globTool];

export function getTools(): Tool[] {
  return builtInTools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema as Tool['input_schema'],
  }));
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  context: ToolExecutionContext
): Promise<{ content: string; is_error?: boolean }> {
  const tool = builtInTools.find((t) => t.name === name);
  if (!tool) {
    return { content: `Tool not found: ${name}`, is_error: true };
  }
  return tool.execute(input, context);
}