import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { parse } from 'smol-toml';

export interface EliConfig {
  url: string;
  key: string;
}

interface TomlConfig {
  api?: {
    url?: string;
    key?: string;
  };
}

/**
 * Resolve configuration from (in priority order):
 * 1. Environment variables: ELI_API_URL, ELI_API_KEY
 * 2. `.elicms.toml` in current working directory
 * 3. `.elicms.toml` in home directory
 */
export function loadConfig(): EliConfig {
  const fileConfig = loadTomlConfig();

  const url = process.env.ELI_API_URL ?? fileConfig?.url ?? 'http://localhost:8080';
  const key = process.env.ELI_API_KEY ?? fileConfig?.key;

  if (!key) {
    process.stderr.write(
      'Error: API key not found.\n' +
        'Set ELI_API_KEY env var or create a .elicms.toml config file:\n\n' +
        '  [api]\n' +
        '  url = "http://localhost:8080"\n' +
        '  key = "eli_..."\n\n' +
        'Config file locations: ./.elicms.toml or ~/.elicms.toml\n',
    );
    process.exit(1);
  }

  return { url, key };
}

function loadTomlConfig(): { url?: string; key?: string } | null {
  const candidates = [resolve(process.cwd(), '.elicms.toml'), join(homedir(), '.elicms.toml')];

  for (const path of candidates) {
    if (!existsSync(path)) continue;

    try {
      const raw = readFileSync(path, 'utf-8');
      const parsed = parse(raw) as TomlConfig;
      process.stderr.write(`Config loaded from ${path}\n`);
      return {
        url: parsed.api?.url,
        key: parsed.api?.key,
      };
    } catch (err) {
      process.stderr.write(`Warning: failed to parse ${path}: ${err}\n`);
    }
  }

  return null;
}
