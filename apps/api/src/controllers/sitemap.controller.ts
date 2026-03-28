import type { Context } from 'koa';
import { SitemapService } from '../services/sitemap.service.js';

export class SitemapController {
  static async getSitemap(ctx: Context) {
    const xml = await SitemapService.generateSitemap();
    ctx.type = 'application/xml';
    ctx.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    ctx.body = xml;
  }
}
