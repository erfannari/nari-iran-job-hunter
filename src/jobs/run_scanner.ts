import { createBot } from '../bot/bot.js';
import { jobService } from './job.service.js';
import { closeDatabase, getDatabase } from '../database/db.js';
import { logger } from '../utils/logger.js';

async function main() {
  logger.info('🚀 Executing Iran Design Job Hunter Scanner...');
  getDatabase();

  const bot = createBot();

  try {
    const result = await jobService.runHuntingCycle(bot);
    logger.info(`✨ Job scanning cycle completed successfully:`, result);
  } catch (error) {
    logger.error('Fatal error during job scanning cycle:', error);
    process.exitCode = 1;
  } finally {
    closeDatabase();
    logger.info('Database connection closed. Scanner exiting cleanly.');
  }
}

main();
