export interface ParsedCommand {
  type: 'message' | 'command' | 'quit';
  content: string;
}

export function parseInput(input: string): ParsedCommand {
  const trimmed = input.trim();

  if (!trimmed) {
    return { type: 'message', content: '' };
  }

  // Special commands
  if (trimmed === '/quit' || trimmed === '/exit' || trimmed === 'quit' || trimmed === 'exit') {
    return { type: 'quit', content: '' };
  }

  if (trimmed === '/help') {
    return { type: 'command', content: 'help' };
  }

  return { type: 'message', content: input };
}