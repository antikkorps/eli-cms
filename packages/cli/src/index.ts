#!/usr/bin/env node

import { codegen } from './codegen.js';

function parseArgs(args: string[]): { command: string; url?: string; output?: string } {
  const command = args[0] ?? 'help';
  let url: string | undefined;
  let output: string | undefined;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) {
      url = args[++i];
    } else if (args[i] === '--output' && args[i + 1]) {
      output = args[++i];
    }
  }

  return { command, url, output };
}

function printHelp(): void {
  process.stderr.write(
    `Usage: eli <command> [options]

Commands:
  codegen    Generate TypeScript interfaces from your Eli CMS schema

Options:
  --url <url>       API base URL (default: from .elicms.toml or http://localhost:8080)
  --output <path>   Output file path (default: eli-cms.d.ts)
`,
  );
}

const { command, url, output } = parseArgs(process.argv.slice(2));

switch (command) {
  case 'codegen':
    codegen({ url, output });
    break;
  case 'help':
  case '--help':
  case '-h':
    printHelp();
    break;
  default:
    process.stderr.write(`Unknown command: ${command}\n\n`);
    printHelp();
    process.exit(1);
}
