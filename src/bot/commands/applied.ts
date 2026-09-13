import { Context } from 'grammy';
import { jobRepository } from '../../database/job.repository.js';
import { JobFormatter } from '../formatters/job.formatter.js';

export async function handleAppliedCommand(ctx: Context): Promise<void> {
  const appliedJobs = jobRepository.getAppliedJobs(10);

  if (appliedJobs.length === 0) {
    await ctx.reply(
      '✅ *No applied jobs recorded yet.*\nClick "✅ Mark Checked / Applied" on any job card to track your applications here.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  await ctx.reply(`✅ *Your Applied Jobs Tracker (${appliedJobs.length}):*`, { parse_mode: 'Markdown' });

  for (const job of appliedJobs) {
    const cardText = JobFormatter.formatJobCard(job);
    const keyboard = JobFormatter.createJobKeyboard(job);

    await ctx.reply(cardText, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
      link_preview_options: { is_disabled: true },
    });
  }
}
