import * as readline from 'readline';
import { ClaudeAPIClient } from './api/client.js';
import { getTools, executeTool } from './tools/index.js';
import { Message, ToolExecutionContext, ToolUse } from './types/index.js';
import { History } from './repl/history.js';
import { parseInput } from './repl/parser.js';
import { loadConfig, saveConfig, getDefaultConfig, Config } from './config.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
});

let config: Config | null = null;

function questionAsync(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function setupConfig(): Promise<Config> {
  const defaults = getDefaultConfig();

  console.log('\n=== First Run Configuration ===\n');

  const apiURL = await questionAsync(`API URL (default: ${defaults.apiURL}): `);
  const model = await questionAsync(`Model (default: ${defaults.model}): `);
  const apiKey = await questionAsync('API Key: ');

  const newConfig: Config = {
    apiURL: apiURL.trim() || defaults.apiURL,
    model: model.trim() || defaults.model,
    apiKey: apiKey.trim(),
  };

  saveConfig(newConfig);
  console.log('\nConfiguration saved!\n');

  return newConfig;
}

const history = new History();
let workingDirectory = process.cwd();
const context: ToolExecutionContext = { workingDirectory };

function printPrompt(): void {
  //   - \x1b[36m — ANSI 转义序列，设置文字颜色为青色 (cyan)                                                                                                                                                                                                                                                                                                           
  // - simple-claude> — 提示符文本                                                                                                                                                                                                                                                                                                                                   
  // - \x1b[0m — ANSI 转义序列，重置颜色为默认       
  process.stdout.write('\x1b[36msimple-claude>\x1b[0m ');
}

function printHelp(): void {
  console.log(`
    Available commands:
      /help     - Show this help message
      /quit     - Exit the program

    You can also type any message to chat with Claude.
  `);
}

async function handleInput(line: string): Promise<void> {
  const parsed = parseInput(line);

  switch (parsed.type) {
    case 'quit':
      console.log('Goodbye!');
      rl.close();
      return;

    case 'command':
      if (parsed.content === 'help') {
        printHelp();
      }
      printPrompt();
      rl.prompt();
      return;
  }

  if (!parsed.content.trim()) {
    printPrompt();
    rl.prompt();
    return;
  }

  // Store in history
  history.add(line);

  // Check for API key from config
  if (!config || !config.apiKey) {
    console.log('\x1b[31mError:\x1b[0m API key not configured. Please check your config file.');
    printPrompt();
    rl.prompt();
    return;
  }

  const client = new ClaudeAPIClient(config.apiKey, config.model, config.apiURL);

  // Build messages
  const messages: Message[] = [
    {
      role: 'user',
      content: parsed.content,
    },
  ];

  const tools = getTools();

  try {
    console.log(''); // Empty line before response
    const response = await client.sendMessageWithTools(messages, tools, async (toolUse: ToolUse) => {
      console.log(`\x1b[33m[Calling tool: ${toolUse.name}]\x1b[0m`);
      const result = await executeTool(toolUse.name, toolUse.input, context);
      return result;
    });

    console.log(response || '(no response)');
  } catch (error) {
    console.log(`\x1b[31mError:\x1b[0m ${(error as Error).message}`);
  }

  printPrompt();
  rl.prompt();
}

// Handle special keys for history
let currentInput = '';
let cursorPosition = 0;

rl.on('line', (line) => {
  handleInput(line).catch(console.error);
});

rl.on('close', () => {
  process.exit(0);
});

// Setup history navigation
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);

  process.stdin.on('keypress', (str, key) => {
    if (key.name === 'c' && key.ctrl) {
      console.log('\nGoodbye!');
      process.exit(0);
    }

    if (key.name === 'd' && key.ctrl) {
      console.log('\nGoodbye!');
      process.exit(0);
    }

    if (key.name === 'up') {
      const prev = history.previous();
      if (prev !== null) {
        // Clear current line
        readline.moveCursor(process.stdout, -1000, 0);
        readline.clearLine(process.stdout, 0);
        printPrompt();
        currentInput = prev;
        cursorPosition = currentInput.length;
        process.stdout.write(currentInput);
      }
    }

    if (key.name === 'down') {
      const next = history.next();
      if (next !== null) {
        readline.moveCursor(process.stdout, -1000, 0);
        readline.clearLine(process.stdout, 0);
        printPrompt();
        currentInput = next;
        cursorPosition = currentInput.length;
        process.stdout.write(currentInput);
      }
    }
  });
}

// Start
async function main() {
  // Check for existing config
  config = loadConfig();

  if (!config || !config.apiKey) {
    config = await setupConfig();
  }

  console.log('Welcome to Simple Claude!');
  console.log('Type /help for available commands');
  console.log('');
  printPrompt();
}

main();