import * as fs from 'fs';
import * as path from 'path';

export interface Config {
  apiURL: string;
  model: string;
  apiKey: string;
}

const DEFAULT_CONFIG: Omit<Config, 'apiKey'> = {
  apiURL: 'https://api.anthropic.com',
  model: 'claude-sonnet-4-20250514',
};

function getConfigPath(): string {
  return path.join(process.cwd(), 'simple-claude-config.json');
}

export function loadConfig(): Config | null {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    return null;
  }
  try {
    const data = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function saveConfig(config: Config): void {
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function getDefaultConfig(): Omit<Config, 'apiKey'> {
  return { ...DEFAULT_CONFIG };
}