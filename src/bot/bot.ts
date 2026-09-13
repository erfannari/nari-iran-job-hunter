import { Bot } from 'grammy';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { handleStartCommand } from './commands/start.js';
import { handleHelpCommand } from './commands/help.js';
import { handleJobsCommand } from './commands/jobs.js';
import { handleSavedCommand } from './commands/saved.js';
import { handleAppliedCommand } from './commands/applied.js';
import { handleStatsCommand } from './commands/stats.js';
import { handleSettingsCommand } from './commands/settings.js';
import { handleResumeCommand } from './commands/resume.js';
import { handleJobActionCallback } from './callbacks/job.actions.js';

export function createBot(): Bot {
  const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

  // Command handlers
  bot.command('start', handleStartCommand);
  bot.command(['help', 'guide'], handleHelpCommand);
  bot.command(['jobs', 'design', 'latest'], handleJobsCommand);
  bot.command('saved', handleSavedCommand);
  bot.command(['applied', 'checked'], handleAppliedCommand);
  bot.command('stats', handleStatsCommand);
  bot.command('settings', handleSettingsCommand);
  bot.command(['resume', 'cv', 'portfolio'], handleResumeCommand);

  // Inline callback query handler
  bot.on('callback_query:data', handleJobActionCallback);

  // Error handling
  bot.catch((err) => {
    logger.error('Telegram bot error encountered:', err.error, { ctx: err.ctx.update });
  });

  return bot;
}
