import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { contentTypes } from '../db/schema/index.js';
import { AppError } from '../utils/app-error.js';
import type { CreateContentTypeInput, UpdateContentTypeInput } from '@eli-cms/shared';

export class ContentTypeService {
  static async findAll() {
    return db.select().from(contentTypes).orderBy(contentTypes.createdAt);
  }

  static async findById(id: string) {
    const [ct] = await db.select().from(contentTypes).where(eq(contentTypes.id, id)).limit(1);
    if (!ct) throw new AppError(404, 'Content type not found');
    return ct;
  }

  static async findBySlug(slug: string) {
    const [ct] = await db.select().from(contentTypes).where(eq(contentTypes.slug, slug)).limit(1);
    return ct ?? null;
  }

  static async create(input: CreateContentTypeInput) {
    const existing = await this.findBySlug(input.slug);
    if (existing) throw new AppError(409, `Slug "${input.slug}" already exists`);

    const [ct] = await db.insert(contentTypes).values(input).returning();
    return ct;
  }

  static async update(id: string, input: UpdateContentTypeInput) {
    await this.findById(id); // ensure exists

    if (input.slug) {
      const existing = await this.findBySlug(input.slug);
      if (existing && existing.id !== id) {
        throw new AppError(409, `Slug "${input.slug}" already exists`);
      }
    }

    const [ct] = await db.update(contentTypes).set(input).where(eq(contentTypes.id, id)).returning();
    return ct;
  }

  static async delete(id: string) {
    await this.findById(id);
    await db.delete(contentTypes).where(eq(contentTypes.id, id));
  }
}
