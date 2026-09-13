import { createBot } from './bot/bot.js';
import { getDatabase, closeDatabase } from './database/db.js';
import { jobService } from './jobs/job.service.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  logger.info('Initializing Iran Design Job Hunter Bot...');
  getDatabase();

  const bot = createBot();

  // Set bot commands menu in Telegram
  try {
    await bot.api.setMyCommands([
      { command: 'jobs', description: '🎨 Top matching UI/UX & Product Design jobs' },
      { command: 'saved', description: '⭐ Bookmarked jobs' },
      { command: 'applied', description: '✅ Applied jobs tracker' },
      { command: 'stats', description: '📊 Hunting statistics' },
      { command: 'settings', description: '⚙️ Alert threshold settings' },
      { command: 'resume', description: '💼 Portfolio and CV links' },
      { command: 'help', description: '📖 Commands & help' },
    ]);
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

  // Start initial scan in background after bot starts
  setTimeout(async () => {
    try {
      logger.info('Running startup job discovery scan...');
      await jobService.runHuntingCycle(bot);
    } catch (err) {
      logger.error('Startup scan encountered an error', err);
    }
  }, 3000);

  logger.info('🤖 Bot is now online and listening for messages...');
  await bot.start();
}

bootstrap().catch((err) => {
  logger.error('Fatal startup error:', err);
  process.exit(1);
});
