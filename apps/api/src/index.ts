import { createApp } from './app.js';
import { env } from './config/environment.js';
import { pool } from './db/index.js';
import { WebhookService } from './services/webhook.service.js';
import { AuditService } from './services/audit.service.js';
import { SchedulerService } from './services/scheduler.service.js';
import { logger } from './utils/logger.js';

const app = createApp();

const server = app.listen(env.API_PORT, () => {
  logger.info({ port: env.API_PORT }, 'API started');

  // Initialize audit logging (must be before webhooks to register listeners first)
  AuditService.initialize();

  // Initialize webhooks after server starts
  WebhookService.initialize().catch((err) => logger.error(err, 'Webhook initialization failed'));

  // Start content scheduler (auto-publish scheduled contents)
  SchedulerService.start();
});

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down gracefully');
  SchedulerService.shutdown();
  WebhookService.shutdown();
  server.close();
  await pool.end();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection — shutting down');
  shutdown();
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception — shutting down');
  shutdown();
});
