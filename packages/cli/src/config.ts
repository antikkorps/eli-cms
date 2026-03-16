import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { parse } from 'smol-toml';

interface TomlConfig {
  api?: {
    url?: string;
  };
}

/**
 * Resolve API URL from (in priority order):
 * 1. --url CLI flag
 * 2. ELI_API_URL environment variable
 * 3. .elicms.toml in current working directory
 * 4. .elicms.toml in home directory
 * 5. Default: http://localhost:8080
 */
export function resolveUrl(flagUrl?: string): string {
  if (flagUrl) return flagUrl;

  if (process.env.ELI_API_URL) return process.env.ELI_API_URL;

  const tomlUrl = loadTomlUrl();
  if (tomlUrl) return tomlUrl;

  return 'http://localhost:8080';
}

function loadTomlUrl(): string | null {
  const candidates = [resolve(process.cwd(), '.elicms.toml'), join(homedir(), '.elicms.toml')];

  for (const path of candidates) {
    if (!existsSync(path)) continue;

    try {
      const raw = readFileSync(path, 'utf-8');
      const parsed = parse(raw) as TomlConfig;
      if (parsed.api?.url) return parsed.api.url;
    } catch {
      // ignore invalid config files
    }
  }

  return null;
}
