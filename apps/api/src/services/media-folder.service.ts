import { eq, and, count as drizzleCount, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { mediaFolders } from '../db/schema/index.js';
import { AppError } from '../utils/app-error.js';
import { buildMeta } from '../utils/pagination.js';
import type { CreateMediaFolderInput, UpdateMediaFolderInput, MediaFolderListQuery, MediaFolderTree } from '@eli-cms/shared';

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 200);
}

export class MediaFolderService {
  static async findAll(query?: MediaFolderListQuery) {
    if (query) {
      const { page, limit, parentId } = query;
      const offset = (page - 1) * limit;

      const filters = [];
      if (parentId) {
        filters.push(eq(mediaFolders.parentId, parentId));
      }
      const where = filters.length > 0 ? and(...filters) : undefined;

      const [{ total }] = await db
        .select({ total: drizzleCount() })
        .from(mediaFolders)
        .where(where);

      const data = await db
        .select()
        .from(mediaFolders)
        .where(where)
        .orderBy(mediaFolders.name)
        .limit(limit)
        .offset(offset);

      return { data, meta: buildMeta(total, page, limit) };
    }

    // No query — return all folders (for tree building)
    const data = await db.select().from(mediaFolders).orderBy(mediaFolders.name);
    return { data };
  }

  static async findById(id: string) {
    const [folder] = await db.select().from(mediaFolders).where(eq(mediaFolders.id, id)).limit(1);
    if (!folder) throw new AppError(404, 'Folder not found');
    return folder;
  }

  static async create(input: CreateMediaFolderInput) {
    const slug = toSlug(input.name);
    const parentId = input.parentId ?? null;

    // Validate parent exists
    if (parentId) {
      await this.findById(parentId);
    }

    const [folder] = await db
      .insert(mediaFolders)
      .values({ name: input.name, slug, parentId })
      .returning();

    return folder;
  }

  static async update(id: string, input: UpdateMediaFolderInput) {
    await this.findById(id);

    const setData: Record<string, unknown> = {};
    if (input.name !== undefined) {
      setData.name = input.name;
      setData.slug = toSlug(input.name);
    }
    if (input.parentId !== undefined) {
      if (input.parentId !== null) {
        // Anti-cycle: cannot set parent to self
        if (input.parentId === id) {
          throw new AppError(400, 'A folder cannot be its own parent');
        }
        // Validate parent exists
        await this.findById(input.parentId);
        // Anti-cycle: walk up from target parent to ensure we don't loop back to `id`
        await this.checkCycle(id, input.parentId);
      }
      setData.parentId = input.parentId;
    }

    if (Object.keys(setData).length === 0) {
      throw new AppError(400, 'No fields to update');
    }

    const [updated] = await db
      .update(mediaFolders)
      .set(setData)
      .where(eq(mediaFolders.id, id))
      .returning();

    return updated;
  }

  static async delete(id: string) {
    await this.findById(id);
    // CASCADE will delete sub-folders; media.folderId will be set to null
    await db.delete(mediaFolders).where(eq(mediaFolders.id, id));
  }

  static async buildTree(): Promise<MediaFolderTree[]> {
    const all = await db.select().from(mediaFolders).orderBy(mediaFolders.name);
    const map = new Map<string, MediaFolderTree>();

    for (const f of all) {
      map.set(f.id, { ...f, children: [] });
    }

    const roots: MediaFolderTree[] = [];
    for (const f of map.values()) {
      if (f.parentId && map.has(f.parentId)) {
        map.get(f.parentId)!.children.push(f);
      } else {
        roots.push(f);
      }
    }

    return roots;
  }

  private static async checkCycle(folderId: string, newParentId: string) {
    let currentId: string | null = newParentId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === folderId) {
        throw new AppError(400, 'Moving this folder here would create a cycle');
      }
      if (visited.has(currentId)) break;
      visited.add(currentId);
      const [parent] = await db
        .select({ parentId: mediaFolders.parentId })
        .from(mediaFolders)
        .where(eq(mediaFolders.id, currentId))
        .limit(1);
      currentId = parent?.parentId ?? null;
    }
  }
}
