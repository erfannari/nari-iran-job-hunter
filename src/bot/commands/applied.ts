import { Context } from 'grammy';
import { jobRepository } from '../../database/job.repository.js';
import { JobFormatter } from '../formatters/job.formatter.js';

export async function handleAppliedCommand(ctx: Context): Promise<void> {
  const appliedJobs = jobRepository.getAppliedJobs(10);

  if (appliedJobs.length === 0) {
    await ctx.reply(
      '✅ <b>No applied jobs recorded yet.</b>\nClick <b>"✅ Mark Applied"</b> on any job card to track your applications here.',
      { parse_mode: 'HTML' }
    );
    return;
  }

  await ctx.reply(`✅ <b>Your Applied Jobs Tracker (${appliedJobs.length}):</b>`, { parse_mode: 'HTML' });

  for (const job of appliedJobs) {
    const cardText = JobFormatter.formatJobCard(job);
    const keyboard = JobFormatter.createJobKeyboard(job);

    await ctx.reply(cardText, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
      link_preview_options: { is_disabled: true },
    });
  }
}
