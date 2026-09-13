import { Context } from 'grammy';
import { jobRepository } from '../../database/job.repository.js';
import { JobFormatter } from '../formatters/job.formatter.js';
import { jobService } from '../../jobs/job.service.js';
import { logger } from '../../utils/logger.js';

export async function handleJobsCommand(ctx: Context): Promise<void> {
  const chatId = String(ctx.chat?.id);
  const user = jobRepository.getUser(chatId);
  const minScore = user?.min_score ?? 60;

  let jobs = jobRepository.getRecentHighMatchingJobs(minScore, 6);

  // If no jobs in DB yet, trigger a fast scan
  if (jobs.length === 0) {
    const statusMsg = await ctx.reply('🔄 Scanning Iranian job boards for the latest UI/UX & Product Design positions...', {
      parse_mode: 'Markdown',
    });

    try {
      await jobService.runHuntingCycle();
      jobs = jobRepository.getRecentHighMatchingJobs(minScore, 6);
      await ctx.api.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
    } catch (e) {
      logger.error('Failed on-demand scan in handleJobsCommand', e);
    }
  }

  if (jobs.length === 0) {
    await ctx.reply(
      '🔍 No high-matching design jobs found right now.\nThe scanner will automatically discover listings on the next cycle!',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  await ctx.reply(`🔥 *Latest Design Job Vacancies (Jobinja & Jobvision):*`, { parse_mode: 'Markdown' });

  for (const job of jobs) {
    const cardText = JobFormatter.formatJobCard(job);
    const keyboard = JobFormatter.createJobKeyboard(job);

    await ctx.reply(cardText, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
      link_preview_options: { is_disabled: true },
    });

    // Small delay to maintain order in Telegram
    await new Promise((r) => setTimeout(r, 200));
  }
}
