import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveUrl } from './config.js';
import { generate } from './generator.js';

interface SchemaResponse {
  success: boolean;
  data: {
    contentTypes: Array<{ slug: string; name: string; fields: unknown[] }>;
    components: Array<{ slug: string; name: string; fields: unknown[] }>;
  };
}

export async function codegen(opts: { url?: string; output?: string }): Promise<void> {
  const baseUrl = resolveUrl(opts.url);
  const schemaUrl = `${baseUrl.replace(/\/+$/, '')}/api/v1/public/schema`;

  process.stderr.write(`Fetching schema from ${schemaUrl}...\n`);

  let res: Response;
  try {
    res = await fetch(schemaUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error: could not connect to ${schemaUrl}\n  ${message}\n`);
    process.exit(1);
  }

  if (!res.ok) {
    process.stderr.write(`Error: ${res.status} ${res.statusText}\n`);
    process.exit(1);
  }

  const json = (await res.json()) as SchemaResponse;
  if (!json.success || !json.data) {
    process.stderr.write('Error: unexpected response format\n');
    process.exit(1);
  }

  const { contentTypes, components } = json.data;

  const output = generate(
    contentTypes as Parameters<typeof generate>[0],
    components as Parameters<typeof generate>[1],
    baseUrl,
  );

  const outPath = resolve(process.cwd(), opts.output ?? 'eli-cms.d.ts');
  writeFileSync(outPath, output, 'utf-8');
  process.stderr.write(`Generated ${outPath}\n`);
  process.stderr.write(`  ${contentTypes.length} content type(s), ${components.length} component(s)\n`);
}
