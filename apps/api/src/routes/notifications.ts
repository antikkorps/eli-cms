import Router from '@koa/router';
import { NotificationController } from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.js';

export const notificationsRouter = new Router({ prefix: '/api/v1/notifications' });

notificationsRouter.get('/', authenticate, NotificationController.list);
notificationsRouter.get('/unread-count', authenticate, NotificationController.unreadCount);
notificationsRouter.patch('/:id/read', authenticate, NotificationController.markRead);
notificationsRouter.patch('/read-all', authenticate, NotificationController.markAllRead);
