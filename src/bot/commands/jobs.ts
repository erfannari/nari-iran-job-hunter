import { Context } from 'grammy';
import { jobRepository } from '../../database/job.repository.js';
import { JobFormatter } from '../formatters/job.formatter.js';

export async function handleJobsCommand(ctx: Context): Promise<void> {
  const chatId = String(ctx.chat?.id);
  const user = jobRepository.getUser(chatId);
  const minScore = user?.min_score ?? 60;

  const jobs = jobRepository.getRecentHighMatchingJobs(minScore, 5);

  if (jobs.length === 0) {
    await ctx.reply(
      '🔍 No high-matching design jobs found in database yet.\nThe scanner will automatically discover listings on the next cycle!',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  await ctx.reply(`🔥 *Top ${jobs.length} Design Job Recommendations:*`, { parse_mode: 'Markdown' });

  for (const job of jobs) {
    const cardText = JobFormatter.formatJobCard(job);
    const keyboard = JobFormatter.createJobKeyboard(job);

    await ctx.reply(cardText, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
      link_preview_options: { is_disabled: true },
    });
  }
}
