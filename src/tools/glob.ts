import { readdir, stat } from 'fs/promises';
import { resolve, join } from 'path';
import { ToolDefinition, ToolExecutionContext } from '../types/index.js';

export const globTool: ToolDefinition = {
  name: 'glob',
  description: 'Search for files matching a glob pattern. Useful for finding files in a directory structure.',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'The glob pattern to match (e.g., "*.ts", "src/**/*.js")',
      },
    },
    required: ['pattern'],
  },
  async execute(input: Record<string, unknown>, context: ToolExecutionContext) {
    const pattern = input.pattern as string;
    const baseDir = context.workingDirectory;

    try {
      const results: string[] = await matchGlob(baseDir, pattern);
      return { content: results.join('\n') || 'No files found' };
    } catch (error: unknown) {
      const err = error as { message?: string };
      return { content: err.message || 'Glob failed', is_error: true };
    }
  },
};

async function matchGlob(baseDir: string, pattern: string): Promise<string[]> {
  const results: string[] = [];

  // Simple glob implementation
  const parts = pattern.split('/');
  let currentDirs = [baseDir];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLast = i === parts.length - 1;

    if (part.includes('*')) {
      const nextDirs: string[] = [];
      for (const dir of currentDirs) {
        try {
          const entries = await readdir(dir);
          const regex = globToRegex(part);

          for (const entry of entries) {
            if (regex.test(entry)) {
              const fullPath = join(dir, entry);
              if (isLast) {
                results.push(fullPath);
              } else {
                try {
                  const st = await stat(fullPath);
                  if (st.isDirectory()) {
                    nextDirs.push(fullPath);
                  }
                } catch {
                  // Not a directory, skip
                }
              }
            }
          }
        } catch {
          // Directory doesn't exist, skip
        }
      }
      currentDirs = nextDirs;
    } else {
      const nextDirs: string[] = [];
      for (const dir of currentDirs) {
        const fullPath = join(dir, part);
        try {
          const st = await stat(fullPath);
          if (st.isDirectory()) {
            nextDirs.push(fullPath);
          } else if (isLast) {
            results.push(fullPath);
          }
        } catch {
          // Path doesn't exist, skip
        }
      }
      currentDirs = nextDirs;
    }
  }

  return results;
}

function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`);
}