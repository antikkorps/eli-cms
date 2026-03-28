import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { contents, contentTypes } from '../db/schema/index.js';
import { SettingsService } from './settings.service.js';

const MAX_URLS = 50_000;

export class SitemapService {
  static async generateSitemap(): Promise<string> {
    const config = await SettingsService.getSeoConfig();

    if (!config?.siteUrl) {
      return buildXml([]);
    }

    const siteUrl = config.siteUrl.replace(/\/+$/, '');
    const excluded = new Set(config.excludedContentTypes ?? []);

    const rows = await db
      .select({
        slug: contents.slug,
        updatedAt: contents.updatedAt,
        ctSlug: contentTypes.slug,
        ctId: contentTypes.id,
      })
      .from(contents)
      .innerJoin(contentTypes, eq(contents.contentTypeId, contentTypes.id))
      .where(and(eq(contents.status, 'published'), isNull(contents.deletedAt)))
      .limit(MAX_URLS);

    const urls: SitemapUrl[] = [];

    for (const row of rows) {
      if (excluded.has(row.ctId)) continue;
      if (!row.slug) continue;

      urls.push({
        loc: `${siteUrl}/${row.ctSlug}/${row.slug}`,
        lastmod: row.updatedAt.toISOString().split('T')[0]!,
      });
    }

    return buildXml(urls);
  }
}

interface SitemapUrl {
  loc: string;
  lastmod: string;
}

function buildXml(urls: SitemapUrl[]): string {
  const entries = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n  </url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
