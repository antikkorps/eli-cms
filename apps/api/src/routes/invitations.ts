import Router from '@koa/router';
import { InvitationController } from '../controllers/invitation.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission-guard.js';
import { authRateLimit, forgotPasswordRateLimit } from '../middleware/rate-limiter.js';
import { USERS_CREATE, USERS_READ } from '@eli-cms/shared';

export const invitationsRouter = new Router({ prefix: '/api/v1/invitations' });

// Public — rate limited
invitationsRouter.get('/verify', forgotPasswordRateLimit, InvitationController.verify);
invitationsRouter.post('/accept', authRateLimit, InvitationController.accept);

// Admin
invitationsRouter.get('/', authenticate, requirePermission(USERS_READ), InvitationController.list);
invitationsRouter.post('/', authenticate, requirePermission(USERS_CREATE), InvitationController.create);
invitationsRouter.post('/:id/resend', authenticate, requirePermission(USERS_CREATE), InvitationController.resend);
invitationsRouter.delete('/:id', authenticate, requirePermission(USERS_CREATE), InvitationController.revoke);
