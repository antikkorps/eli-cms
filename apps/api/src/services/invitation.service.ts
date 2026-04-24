import { createHash, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { eq, and, isNull, isNotNull, gt, lte, desc, count as drizzleCount, type SQL } from 'drizzle-orm';
import { db } from '../db/index.js';
import { userInvitations, users, roles } from '../db/schema/index.js';
import { AppError } from '../utils/app-error.js';
import { buildMeta } from '../utils/pagination.js';
import { INVITATION_EXPIRY_MIN } from '@eli-cms/shared';
import type {
  CreateInvitationInput,
  AcceptInvitationInput,
  InvitationListQuery,
  UserInvitation,
  UserInvitationStatus,
} from '@eli-cms/shared';
import { EmailService } from './email.service.js';
import { eventBus } from './event-bus.js';
import type { Actor } from './content.service.js';
import { logger } from '../utils/logger.js';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function computeStatus(row: {
  acceptedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
}): UserInvitationStatus {
  if (row.acceptedAt) return 'accepted';
  if (row.revokedAt) return 'revoked';
  if (row.expiresAt < new Date()) return 'expired';
  return 'pending';
}

type InvitationRow = typeof userInvitations.$inferSelect;

function toPublicInvitation(
  row: InvitationRow,
  extras: { roleName?: string; invitedByEmail?: string; invitedByName?: string | null } = {},
): UserInvitation {
  return {
    id: row.id,
    email: row.email,
    roleId: row.roleId,
    roleName: extras.roleName,
    invitedBy: row.invitedBy,
    invitedByEmail: extras.invitedByEmail,
    invitedByName: extras.invitedByName,
    expiresAt: row.expiresAt,
    acceptedAt: row.acceptedAt,
    revokedAt: row.revokedAt,
    status: computeStatus(row),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class InvitationService {
  static async create(
    input: CreateInvitationInput,
    inviterUserId: string,
    frontendUrl: string,
    actor?: Actor,
  ): Promise<UserInvitation> {
    const email = input.email.toLowerCase();

    // Email must not already belong to an existing user
    const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existingUser) throw new AppError(409, 'A user with this email already exists');

    // Role must exist
    const [role] = await db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.id, input.roleId))
      .limit(1);
    if (!role) throw new AppError(400, 'Role not found');

    // Block duplicate pending invitation
    const now = new Date();
    const [pending] = await db
      .select({ id: userInvitations.id })
      .from(userInvitations)
      .where(
        and(
          eq(userInvitations.email, email),
          isNull(userInvitations.acceptedAt),
          isNull(userInvitations.revokedAt),
          gt(userInvitations.expiresAt, now),
        ),
      )
      .limit(1);
    if (pending) throw new AppError(409, 'A pending invitation already exists for this email');

    const rawToken = randomUUID();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_MIN * 60_000);

    const [row] = await db
      .insert(userInvitations)
      .values({ email, roleId: input.roleId, tokenHash, invitedBy: inviterUserId, expiresAt })
      .returning();

    const inviter = await this.getInviterDisplay(inviterUserId);

    try {
      await EmailService.sendInvitation(email, rawToken, frontendUrl, {
        inviterName: inviter.displayName,
        roleName: role.name,
        expiresAt,
      });
    } catch (err) {
      logger.warn({ err, invitationId: row.id }, 'Failed to send invitation email');
    }

    const actorData = actor
      ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent }
      : {};
    eventBus.emit('user.invitation_sent', { invitationId: row.id, email, invitedBy: inviterUserId, ...actorData });

    return toPublicInvitation(row, {
      roleName: role.name,
      invitedByEmail: inviter.email,
      invitedByName: inviter.displayName,
    });
  }

  static async findAll(query: InvitationListQuery) {
    const { page, limit, status } = query;
    const offset = (page - 1) * limit;
    const now = new Date();

    const filters: SQL[] = [];
    if (status === 'pending') {
      filters.push(isNull(userInvitations.acceptedAt));
      filters.push(isNull(userInvitations.revokedAt));
      filters.push(gt(userInvitations.expiresAt, now));
    } else if (status === 'accepted') {
      filters.push(isNotNull(userInvitations.acceptedAt));
    } else if (status === 'revoked') {
      filters.push(isNotNull(userInvitations.revokedAt));
    } else if (status === 'expired') {
      filters.push(isNull(userInvitations.acceptedAt));
      filters.push(isNull(userInvitations.revokedAt));
      filters.push(lte(userInvitations.expiresAt, now));
    }

    const where = filters.length > 0 ? and(...filters) : undefined;

    const [{ total }] = await db.select({ total: drizzleCount() }).from(userInvitations).where(where);

    const rows = await db
      .select({
        inv: userInvitations,
        roleName: roles.name,
        inviterEmail: users.email,
        inviterFirstName: users.firstName,
        inviterLastName: users.lastName,
      })
      .from(userInvitations)
      .innerJoin(roles, eq(userInvitations.roleId, roles.id))
      .leftJoin(users, eq(userInvitations.invitedBy, users.id))
      .where(where)
      .orderBy(desc(userInvitations.createdAt))
      .limit(limit)
      .offset(offset);

    const data = rows.map((r) =>
      toPublicInvitation(r.inv, {
        roleName: r.roleName,
        invitedByEmail: r.inviterEmail ?? undefined,
        invitedByName: [r.inviterFirstName, r.inviterLastName].filter(Boolean).join(' ') || null,
      }),
    );

    return { data, meta: buildMeta(total, page, limit) };
  }

  static async revoke(id: string, actor?: Actor): Promise<void> {
    const [row] = await db.select().from(userInvitations).where(eq(userInvitations.id, id)).limit(1);
    if (!row) throw new AppError(404, 'Invitation not found');
    if (row.acceptedAt) throw new AppError(400, 'Cannot revoke an accepted invitation');
    if (row.revokedAt) return; // idempotent

    await db.update(userInvitations).set({ revokedAt: new Date() }).where(eq(userInvitations.id, id));

    const actorData = actor
      ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent }
      : {};
    eventBus.emit('user.invitation_revoked', { invitationId: id, ...actorData });
  }

  static async resend(id: string, inviterUserId: string, frontendUrl: string, actor?: Actor): Promise<UserInvitation> {
    const [row] = await db.select().from(userInvitations).where(eq(userInvitations.id, id)).limit(1);
    if (!row) throw new AppError(404, 'Invitation not found');
    if (row.invitedBy !== inviterUserId) {
      throw new AppError(403, 'Only the original inviter can resend this invitation');
    }
    if (row.acceptedAt) throw new AppError(400, 'Cannot resend an accepted invitation');

    const [role] = await db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.id, row.roleId))
      .limit(1);
    if (!role) throw new AppError(400, 'Role no longer exists');

    const rawToken = randomUUID();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_MIN * 60_000);

    const [updated] = await db
      .update(userInvitations)
      .set({ tokenHash, expiresAt, revokedAt: null })
      .where(eq(userInvitations.id, id))
      .returning();

    const inviter = await this.getInviterDisplay(inviterUserId);

    try {
      await EmailService.sendInvitation(row.email, rawToken, frontendUrl, {
        inviterName: inviter.displayName,
        roleName: role.name,
        expiresAt,
      });
    } catch (err) {
      logger.warn({ err, invitationId: id }, 'Failed to resend invitation email');
    }

    const actorData = actor
      ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent }
      : {};
    eventBus.emit('user.invitation_resent', { invitationId: id, ...actorData });

    return toPublicInvitation(updated, {
      roleName: role.name,
      invitedByEmail: inviter.email,
      invitedByName: inviter.displayName,
    });
  }

  static async verify(token: string): Promise<{ email: string; roleName: string }> {
    const tokenHash = hashToken(token);

    const [row] = await db
      .select({ inv: userInvitations, roleName: roles.name })
      .from(userInvitations)
      .innerJoin(roles, eq(userInvitations.roleId, roles.id))
      .where(eq(userInvitations.tokenHash, tokenHash))
      .limit(1);

    if (!row) throw new AppError(400, 'Invalid or expired invitation');
    if (row.inv.acceptedAt) throw new AppError(400, 'This invitation has already been accepted');
    if (row.inv.revokedAt) throw new AppError(400, 'This invitation has been revoked');
    if (row.inv.expiresAt < new Date()) throw new AppError(400, 'This invitation has expired');

    return { email: row.inv.email, roleName: row.roleName };
  }

  static async accept(input: AcceptInvitationInput, actor?: Actor): Promise<{ id: string; email: string }> {
    const tokenHash = hashToken(input.token);

    const [row] = await db.select().from(userInvitations).where(eq(userInvitations.tokenHash, tokenHash)).limit(1);

    if (!row) throw new AppError(400, 'Invalid or expired invitation');
    if (row.acceptedAt) throw new AppError(400, 'This invitation has already been accepted');
    if (row.revokedAt) throw new AppError(400, 'This invitation has been revoked');
    if (row.expiresAt < new Date()) throw new AppError(400, 'This invitation has expired');

    // Race-safety: email uniqueness guaranteed by users.email unique constraint
    const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, row.email)).limit(1);
    if (existingUser) throw new AppError(409, 'A user with this email already exists');

    const hashedPassword = await bcrypt.hash(input.password, 12);

    const created = await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          email: row.email,
          password: hashedPassword,
          firstName: input.firstName ?? null,
          lastName: input.lastName ?? null,
          roleId: row.roleId,
        })
        .returning({ id: users.id, email: users.email });

      await tx.update(userInvitations).set({ acceptedAt: new Date() }).where(eq(userInvitations.id, row.id));

      return user;
    });

    const actorData = actor
      ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent }
      : { actorId: created.id, actorType: 'user' as const };
    eventBus.emit('user.invitation_accepted', {
      invitationId: row.id,
      userId: created.id,
      email: created.email,
      ...actorData,
    });

    return created;
  }

  private static async getInviterDisplay(userId: string): Promise<{ email: string; displayName: string }> {
    const [u] = await db
      .select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!u) return { email: '', displayName: 'An administrator' };
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
    return { email: u.email, displayName: name || u.email };
  }
}
