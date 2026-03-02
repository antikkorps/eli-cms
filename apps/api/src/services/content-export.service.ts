import { eq, and, isNull } from 'drizzle-orm';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import { db } from '../db/index.js';
import { contents } from '../db/schema/index.js';
import { ContentTypeService } from './content-type.service.js';
import { ContentService } from './content.service.js';
import { buildContentDataSchema } from '@eli-cms/shared';
import type { ExportContentQuery, FieldDefinition } from '@eli-cms/shared';
import type { Actor } from './content.service.js';

export class ContentExportService {
  static async exportContents(query: ExportContentQuery): Promise<{ data: string; mimeType: string; extension: string }> {
    const contentType = await ContentTypeService.findById(query.contentTypeId);

    const filters = [eq(contents.contentTypeId, query.contentTypeId), isNull(contents.deletedAt)];
    if (query.status) filters.push(eq(contents.status, query.status));

    const rows = await db
      .select()
      .from(contents)
      .where(and(...filters))
      .orderBy(contents.createdAt);

    switch (query.format) {
      case 'csv':
        return { data: this.toCSV(rows, contentType.fields), mimeType: 'text/csv', extension: 'csv' };
      case 'xml':
        return { data: this.toXML(rows), mimeType: 'application/xml', extension: 'xml' };
      case 'json':
      default:
        return { data: JSON.stringify(rows, null, 2), mimeType: 'application/json', extension: 'json' };
    }
  }

  static async importContents(
    contentTypeId: string,
    fileBuffer: Buffer,
    format: string,
    actor?: Actor,
  ): Promise<{ imported: number; failed: number; errors: string[] }> {
    const contentType = await ContentTypeService.findById(contentTypeId);
    const dataSchema = buildContentDataSchema(contentType.fields);

    let records: Array<Record<string, unknown>>;
    try {
      switch (format) {
        case 'csv':
          records = this.parseCSV(fileBuffer.toString('utf-8'), contentType.fields);
          break;
        case 'xml':
          records = this.parseXML(fileBuffer.toString('utf-8'));
          break;
        case 'json':
        default:
          records = JSON.parse(fileBuffer.toString('utf-8'));
          break;
      }
    } catch (err) {
      return { imported: 0, failed: 0, errors: [`Failed to parse file: ${(err as Error).message}`] };
    }

    if (!Array.isArray(records)) {
      return { imported: 0, failed: 0, errors: ['File must contain an array of records'] };
    }

    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const data = row.data && typeof row.data === 'object' ? row.data as Record<string, unknown> : row;
      const status = typeof row.status === 'string' && ['draft', 'published'].includes(row.status) ? row.status : 'draft';

      const result = dataSchema.safeParse(data);
      if (!result.success) {
        failed++;
        errors.push(`Row ${i + 1}: ${result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ')}`);
        continue;
      }

      try {
        await ContentService.create({
          contentTypeId,
          status: status as 'draft' | 'published',
          data: result.data as Record<string, unknown>,
        }, actor);
        imported++;
      } catch (err) {
        failed++;
        errors.push(`Row ${i + 1}: ${(err as Error).message}`);
      }
    }

    return { imported, failed, errors };
  }

  private static toCSV(rows: Array<Record<string, unknown>>, fields: FieldDefinition[]): string {
    const dataFieldNames = fields.map((f) => f.name);
    const headers = ['id', 'slug', 'status', ...dataFieldNames, 'createdAt', 'updatedAt'];

    const escape = (val: unknown): string => {
      const str = val === null || val === undefined ? '' : String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines = [headers.join(',')];
    for (const row of rows) {
      const data = (row.data ?? {}) as Record<string, unknown>;
      const values = [
        row.id,
        row.slug,
        row.status,
        ...dataFieldNames.map((name) => {
          const val = data[name];
          return Array.isArray(val) ? JSON.stringify(val) : val;
        }),
        row.createdAt,
        row.updatedAt,
      ];
      lines.push(values.map(escape).join(','));
    }

    return lines.join('\n');
  }

  private static toXML(rows: Array<Record<string, unknown>>): string {
    const builder = new XMLBuilder({ format: true, ignoreAttributes: false });
    return builder.build({ contents: { content: rows } });
  }

  private static parseCSV(csv: string, fields: FieldDefinition[]): Array<Record<string, unknown>> {
    const lines = csv.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = this.parseCSVLine(lines[0]);
    const records: Array<Record<string, unknown>> = [];
    const fieldMap = new Map(fields.map((f) => [f.name, f]));

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const data: Record<string, unknown> = {};

      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        const value = values[j] ?? '';
        const fieldDef = fieldMap.get(header);

        if (fieldDef) {
          data[header] = this.coerceCSVValue(value, fieldDef.type);
        }
      }

      const status = values[headers.indexOf('status')] ?? 'draft';
      records.push({ data, status });
    }

    return records;
  }

  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          result.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
    }
    result.push(current);
    return result;
  }

  private static coerceCSVValue(value: string, type: string): unknown {
    if (value === '') return undefined;
    switch (type) {
      case 'number': return Number(value);
      case 'boolean': return value === 'true';
      default: {
        // Try JSON parse for arrays (media multiple)
        if (value.startsWith('[')) {
          try { return JSON.parse(value); } catch { /* fall through */ }
        }
        return value;
      }
    }
  }

  private static parseXML(xml: string): Array<Record<string, unknown>> {
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xml);
    const items = parsed?.contents?.content;
    if (!items) return [];
    return Array.isArray(items) ? items : [items];
  }
}
