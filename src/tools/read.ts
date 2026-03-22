import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { ToolDefinition, ToolExecutionContext } from '../types/index.js';

export const readTool: ToolDefinition = {
  name: 'read',
  description: 'Read the contents of a file from the filesystem. Returns the file content as a string.',
  inputSchema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'The path to the file to read',
      },
    },
    required: ['file_path'],
  },
  async execute(input: Record<string, unknown>, context: ToolExecutionContext) {
    const filePath = input.file_path as string;
    const resolvedPath = resolve(context.workingDirectory, filePath);
    try {
      const content = await readFile(resolvedPath, 'utf-8');
      return { content };
    } catch (error: unknown) {
      const err = error as { message?: string };
      return { content: err.message || 'Failed to read file', is_error: true };
    }
  },
};