import Router from '@koa/router';
import { SetupController } from '../controllers/setup.controller.js';

export const setupRouter = new Router({ prefix: '/api/v1/setup' });

setupRouter.get('/status', SetupController.status);
setupRouter.post('/', SetupController.initialize);
