import type { Context } from 'koa';
import { createRoleSchema, updateRoleSchema, roleListQuerySchema } from '@eli-cms/shared';
import { RoleService } from '../services/role.service.js';
import { AppError } from '../utils/app-error.js';
import { extractActor } from '../utils/extract-actor.js';

export class RoleController {
  static async list(ctx: Context) {
    const result = roleListQuerySchema.safeParse(ctx.query);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const { data, meta } = await RoleService.findAll(result.data);
    ctx.body = { success: true, data, meta };
  }

  static async get(ctx: Context) {
    const role = await RoleService.findById(ctx.params.id);
    ctx.body = { success: true, data: role };
  }

  static async create(ctx: Context) {
    const result = createRoleSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const role = await RoleService.create(result.data, extractActor(ctx));
    ctx.status = 201;
    ctx.body = { success: true, data: role };
  }

  static async update(ctx: Context) {
    const result = updateRoleSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const role = await RoleService.update(ctx.params.id, result.data, extractActor(ctx));
    ctx.body = { success: true, data: role };
  }

  static async delete(ctx: Context) {
    await RoleService.delete(ctx.params.id, extractActor(ctx));
    ctx.body = { success: true };
  }
}
