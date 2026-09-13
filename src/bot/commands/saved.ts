import { Context } from 'grammy';
import { jobRepository } from '../../database/job.repository.js';
import { JobFormatter } from '../formatters/job.formatter.js';

export async function handleSavedCommand(ctx: Context): Promise<void> {
  const savedJobs = jobRepository.getSavedJobs(10);

  if (savedJobs.length === 0) {
    await ctx.reply('⭐ <b>No saved jobs yet.</b>\nClick the <b>"⭐ Save"</b> button on any job card to bookmark it here.', {
      parse_mode: 'HTML',
    });
    return;
  }

  await ctx.reply(`⭐ <b>Your Bookmarked Design Jobs (${savedJobs.length}):</b>`, { parse_mode: 'HTML' });

  for (const job of savedJobs) {
    const cardText = JobFormatter.formatJobCard(job);
    const keyboard = JobFormatter.createJobKeyboard(job);

    await ctx.reply(cardText, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
      link_preview_options: { is_disabled: true },
    });
  }
}
