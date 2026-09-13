import http from 'http';
import { createBot } from './bot/bot.js';
import { getDatabase, closeDatabase } from './database/db.js';
import { jobService } from './jobs/job.service.js';
import { logger } from './utils/logger.js';

function startHealthCheckServer() {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'iran-job-hunter', timestamp: new Date().toISOString() }));
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn(`Port ${port} in use, health check endpoint skipped locally.`);
    } else {
      logger.warn('Health check server error:', err.message);
    }
  });

  server.listen(port, () => {
    logger.info(`Health check HTTP server listening on port ${port}`);
  });

  return server;
}

async function bootstrap() {
  logger.info('Initializing Iran Design Job Hunter Bot...');
  startHealthCheckServer();
  getDatabase();

  const bot = createBot();

  // Set bot descriptions and commands menu in Telegram
  try {
    await bot.api.setMyDescription(
      '🎨 Iran Design Job Hunter Bot 🇮🇷\n\n' +
      'Automated 24/7 scanner & hunter for UI/UX & Product Design positions across Iran (Jobinja, Jobvision, and more).\n\n' +
      '⚡ Real-time alerts with Gemini AI fit analysis\n' +
      '🎯 Curated specifically for UI/UX & Product Designers\n' +
      '⭐ 1-click apply, bookmarking & tracking'
    );

    await bot.api.setMyShortDescription(
      '🎨 24/7 Automated UI/UX & Product Design Job Hunter in Iran powered by Gemini AI.'
    );

    await bot.api.setMyCommands([
      { command: 'jobs', description: '🎨 View top matching design jobs' },
      { command: 'saved', description: '⭐ View bookmarked jobs' },
      { command: 'applied', description: '✅ View applied jobs tracker' },
      { command: 'stats', description: '📊 Scanner & hunting statistics' },
      { command: 'settings', description: '⚙️ Notification threshold settings' },
      { command: 'resume', description: '💼 Portfolio and CV links' },
      { command: 'help', description: '📖 Commands & usage guide' },
    ]);
    logger.info('Registered Telegram bot description and commands menu.');
  } catch (err) {
    logger.warn('Could not register bot commands menu with Telegram API', { error: (err as Error).message });
  }

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    await bot.stop();
    closeDatabase();
    process.exit(0);
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));

  // Periodic background hunter (every 5 minutes while bot is alive)
  const SCAN_INTERVAL_MS = 5 * 60 * 1000;
  setInterval(async () => {
    try {
      logger.info('Running periodic background job scan...');
      await jobService.runHuntingCycle(bot);
    } catch (err) {
      logger.error('Periodic scan encountered an error', err);
    }
  }, SCAN_INTERVAL_MS);

  // Start initial scan in background after bot starts
  setTimeout(async () => {
    try {
      logger.info('Running startup job discovery scan...');
      await jobService.runHuntingCycle(bot);
    } catch (err) {
      logger.error('Startup scan encountered an error', err);
    }
  }, 3000);

  logger.info('🤖 Bot is now online and listening for messages 24/7...');
  await bot.start();
}

bootstrap().catch((err) => {
  logger.error('Fatal startup error:', err);
  process.exit(1);
});
