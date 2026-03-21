import Router from '@koa/router';
import { StatsController } from '../controllers/stats.controller.js';
import { authenticate } from '../middleware/auth.js';

export const statsRouter = new Router({ prefix: '/api/v1/stats' });

statsRouter.get('/dashboard', authenticate, StatsController.dashboard);
