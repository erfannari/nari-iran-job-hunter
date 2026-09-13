import { Context } from 'grammy';
import { jobRepository } from '../../database/job.repository.js';
import { JobFormatter } from '../formatters/job.formatter.js';
import { jobService } from '../../jobs/job.service.js';
import { logger } from '../../utils/logger.js';

export async function handleJobsCommand(ctx: Context): Promise<void> {
  const chatId = String(ctx.chat?.id);
  const user = jobRepository.getUser(chatId);
  const minScore = user?.min_score ?? 60;

  // Fetch top 5 most recent matching design jobs (under 40 days old)
  let jobs = jobRepository.getRecentHighMatchingJobs(minScore, 5, 40);

  // If no jobs in DB yet, trigger a fast scan
  if (jobs.length === 0) {
    const statusMsg = await ctx.reply('🔄 Scanning Iranian job boards for the latest UI/UX & Product Design positions...', {
      parse_mode: 'HTML',
    });

    try {
      await jobService.runHuntingCycle();
      jobs = jobRepository.getRecentHighMatchingJobs(minScore, 5, 40);
      await ctx.api.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
    } catch (e) {
      logger.error('Failed on-demand scan in handleJobsCommand', e);
    }
  }

  if (jobs.length === 0) {
    await ctx.reply(
      '🔍 <b>No high-matching design jobs found right now.</b>\nThe scanner will automatically discover listings on the next 5-minute cycle!',
      { parse_mode: 'HTML' }
    );
    return;
  }

  await ctx.reply(`🔥 <b>Top ${jobs.length} Latest Design Jobs:</b>`, { parse_mode: 'HTML' });

  // Reverse so the highest score is delivered last (bottom of chat)
  const jobsToSend = [...jobs].reverse();

  for (const job of jobsToSend) {
    const cardText = JobFormatter.formatJobCard(job);
    const keyboard = JobFormatter.createJobKeyboard(job);

    await ctx.reply(cardText, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
      link_preview_options: { is_disabled: true },
    });

    // Small delay to maintain message order in Telegram
    await new Promise((r) => setTimeout(r, 150));
  }
}
