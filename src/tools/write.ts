import { writeFile, mkdir } from 'fs/promises';
import { resolve, dirname } from 'path';
import { ToolDefinition, ToolExecutionContext } from '../types/index.js';

export const writeTool: ToolDefinition = {
  name: 'write',
  description: 'Write content to a file. Can create new files or overwrite existing ones.',
  inputSchema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'The path to the file to write',
      },
      content: {
        type: 'string',
        description: 'The content to write to the file',
      },
    },
    required: ['file_path', 'content'],
  },
  async execute(input: Record<string, unknown>, context: ToolExecutionContext) {
    const filePath = input.file_path as string;
    const content = input.content as string;
    const resolvedPath = resolve(context.workingDirectory, filePath);

    try {
      await mkdir(dirname(resolvedPath), { recursive: true });
      await writeFile(resolvedPath, content, 'utf-8');
      return { content: `File written: ${resolvedPath}` };
    } catch (error: unknown) {
      const err = error as { message?: string };
      return { content: err.message || 'Failed to write file', is_error: true };
    }
  },
};