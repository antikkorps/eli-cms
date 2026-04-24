import { describe, it, expect, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { InvitationService } from './invitation.service.js';
import { AppError } from '../utils/app-error.js';
import { db } from '../db/index.js';
import { userInvitations, users } from '../db/schema/index.js';
import { agent, getAdminToken, getRoleId } from '../__tests__/helpers/setup.js';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function getAdminUserId(): Promise<string> {
  const token = await getAdminToken();
  const res = await agent().get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
  return res.body.data.id;
}

describe('InvitationService', () => {
  let adminId: string;
  let editorRoleId: string;

  beforeEach(async () => {
    adminId = await getAdminUserId();
    editorRoleId = await getRoleId('editor');
  });

  describe('create', () => {
    it('creates an invitation with pending status', async () => {
      const inv = await InvitationService.create(
        { email: 'new@example.com', roleId: editorRoleId },
        adminId,
        'http://localhost:3000',
      );
      expect(inv.email).toBe('new@example.com');
      expect(inv.roleId).toBe(editorRoleId);
      expect(inv.status).toBe('pending');
      expect(inv.acceptedAt).toBeNull();
      expect(inv.revokedAt).toBeNull();
    });

    it('rejects if a user already exists with that email', async () => {
      await agent().post('/api/v1/auth/register').send({
        email: 'existing@example.com',
        password: 'pass1234',
      });
      await expect(
        InvitationService.create(
          { email: 'existing@example.com', roleId: editorRoleId },
          adminId,
          'http://localhost:3000',
        ),
      ).rejects.toThrow(AppError);
    });

    it('rejects a duplicate pending invitation for the same email', async () => {
      await InvitationService.create(
        { email: 'dup@example.com', roleId: editorRoleId },
        adminId,
        'http://localhost:3000',
      );
      await expect(
        InvitationService.create({ email: 'dup@example.com', roleId: editorRoleId }, adminId, 'http://localhost:3000'),
      ).rejects.toThrow(/pending invitation/);
    });

    it('allows a new invitation after the previous one was revoked', async () => {
      const first = await InvitationService.create(
        { email: 'again@example.com', roleId: editorRoleId },
        adminId,
        'http://localhost:3000',
      );
      await InvitationService.revoke(first.id);
      const second = await InvitationService.create(
        { email: 'again@example.com', roleId: editorRoleId },
        adminId,
        'http://localhost:3000',
      );
      expect(second.id).not.toBe(first.id);
      expect(second.status).toBe('pending');
    });

    it('rejects an unknown role', async () => {
      await expect(
        InvitationService.create(
          { email: 'x@example.com', roleId: '00000000-0000-0000-0000-000000000000' },
          adminId,
          'http://localhost:3000',
        ),
      ).rejects.toThrow(AppError);
    });
  });

  describe('verify + accept', () => {
    async function createWithRawToken(email: string) {
      await InvitationService.create({ email, roleId: editorRoleId }, adminId, 'http://localhost:3000');
      // For testing we need the raw token. Since create() returns hash only, we insert a known-token invitation.
      const rawToken = '11111111-1111-1111-1111-111111111111';
      await db
        .update(userInvitations)
        .set({ tokenHash: hashToken(rawToken) })
        .where(eq(userInvitations.email, email));
      return rawToken;
    }

    it('verify returns email and role for a valid token', async () => {
      const token = await createWithRawToken('verify@example.com');
      const result = await InvitationService.verify(token);
      expect(result.email).toBe('verify@example.com');
      expect(result.roleName).toBe('Editor');
    });

    it('verify throws for an expired invitation', async () => {
      const token = await createWithRawToken('expired@example.com');
      await db
        .update(userInvitations)
        .set({ expiresAt: new Date(Date.now() - 60_000) })
        .where(eq(userInvitations.email, 'expired@example.com'));
      await expect(InvitationService.verify(token)).rejects.toThrow(/expired/);
    });

    it('accept creates a user with the invited role and marks invitation accepted', async () => {
      const token = await createWithRawToken('accept@example.com');
      const created = await InvitationService.accept({
        token,
        password: 'secret123',
        firstName: 'Alice',
      });
      expect(created.email).toBe('accept@example.com');

      const [user] = await db.select().from(users).where(eq(users.email, 'accept@example.com')).limit(1);
      expect(user.firstName).toBe('Alice');
      expect(user.roleId).toBe(editorRoleId);

      // verify should now fail (already accepted)
      await expect(InvitationService.verify(token)).rejects.toThrow(/already been accepted/);
    });

    it('accept rejects a revoked invitation', async () => {
      const token = await createWithRawToken('revoked@example.com');
      const [inv] = await db.select().from(userInvitations).where(eq(userInvitations.email, 'revoked@example.com'));
      await InvitationService.revoke(inv.id);
      await expect(InvitationService.accept({ token, password: 'secret123' })).rejects.toThrow(/revoked/);
    });
  });

  describe('revoke', () => {
    it('rejects revoking an already accepted invitation', async () => {
      const inv = await InvitationService.create(
        { email: 'acc@example.com', roleId: editorRoleId },
        adminId,
        'http://localhost:3000',
      );
      await db.update(userInvitations).set({ acceptedAt: new Date() }).where(eq(userInvitations.id, inv.id));
      await expect(InvitationService.revoke(inv.id)).rejects.toThrow(/accepted/);
    });

    it('is idempotent on already-revoked invitations', async () => {
      const inv = await InvitationService.create(
        { email: 'idem@example.com', roleId: editorRoleId },
        adminId,
        'http://localhost:3000',
      );
      await InvitationService.revoke(inv.id);
      await expect(InvitationService.revoke(inv.id)).resolves.toBeUndefined();
    });
  });

  describe('resend', () => {
    it('only the original inviter can resend', async () => {
      const inv = await InvitationService.create(
        { email: 'resend@example.com', roleId: editorRoleId },
        adminId,
        'http://localhost:3000',
      );
      await expect(
        InvitationService.resend(inv.id, '00000000-0000-0000-0000-000000000000', 'http://localhost:3000'),
      ).rejects.toThrow(/original inviter/);
    });

    it('rotates the token and clears revokedAt', async () => {
      const inv = await InvitationService.create(
        { email: 'rotate@example.com', roleId: editorRoleId },
        adminId,
        'http://localhost:3000',
      );
      const [before] = await db.select().from(userInvitations).where(eq(userInvitations.id, inv.id));
      await InvitationService.revoke(inv.id);
      const resent = await InvitationService.resend(inv.id, adminId, 'http://localhost:3000');
      expect(resent.status).toBe('pending');

      const [after] = await db.select().from(userInvitations).where(eq(userInvitations.id, inv.id));
      expect(after.tokenHash).not.toBe(before.tokenHash);
      expect(after.revokedAt).toBeNull();
    });

    it('rejects resending an accepted invitation', async () => {
      const inv = await InvitationService.create(
        { email: 'acc2@example.com', roleId: editorRoleId },
        adminId,
        'http://localhost:3000',
      );
      await db.update(userInvitations).set({ acceptedAt: new Date() }).where(eq(userInvitations.id, inv.id));
      await expect(InvitationService.resend(inv.id, adminId, 'http://localhost:3000')).rejects.toThrow(/accepted/);
    });
  });

  describe('findAll', () => {
    it('filters by status', async () => {
      const a = await InvitationService.create(
        { email: 'a@example.com', roleId: editorRoleId },
        adminId,
        'http://localhost:3000',
      );
      const b = await InvitationService.create(
        { email: 'b@example.com', roleId: editorRoleId },
        adminId,
        'http://localhost:3000',
      );
      await InvitationService.revoke(b.id);

      const pending = await InvitationService.findAll({ page: 1, limit: 50, status: 'pending' });
      expect(pending.data.map((i) => i.id)).toContain(a.id);
      expect(pending.data.map((i) => i.id)).not.toContain(b.id);

      const revoked = await InvitationService.findAll({ page: 1, limit: 50, status: 'revoked' });
      expect(revoked.data.map((i) => i.id)).toContain(b.id);
    });
  });
});
