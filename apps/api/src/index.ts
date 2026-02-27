import { createApp } from './app.js';
import { env } from './config/environment.js';
import { pool } from './db/index.js';
import { WebhookService } from './services/webhook.service.js';

const app = createApp();

const server = app.listen(env.API_PORT, () => {
  console.log(`API running on http://localhost:${env.API_PORT}`);

  // Initialize webhooks after server starts
  WebhookService.initialize().catch(console.error);
});

// Graceful shutdown
async function shutdown() {
  console.log('\nShutting down gracefully...');
  WebhookService.shutdown();
  server.close();
  await pool.end();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
