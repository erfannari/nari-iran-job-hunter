import { Context } from 'grammy';
import { jobRepository } from '../../database/job.repository.js';
import { JobFormatter } from '../formatters/job.formatter.js';

export async function handleSavedCommand(ctx: Context): Promise<void> {
  const savedJobs = jobRepository.getSavedJobs(10);

  if (savedJobs.length === 0) {
    await ctx.reply('⭐ *No saved jobs yet.*\nClick the "⭐ Save" button on any job card to bookmark it here.', {
      parse_mode: 'Markdown',
    });
    return;
  }

  await ctx.reply(`⭐ *Your Bookmarked Design Jobs (${savedJobs.length}):*`, { parse_mode: 'Markdown' });

  for (const job of savedJobs) {
    const cardText = JobFormatter.formatJobCard(job);
    const keyboard = JobFormatter.createJobKeyboard(job);

    await ctx.reply(cardText, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
      link_preview_options: { is_disabled: true },
    });
  }
}
