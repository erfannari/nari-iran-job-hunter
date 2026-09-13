import { Context } from 'grammy';
import { jobRepository } from '../../database/job.repository.js';

export async function handleStatsCommand(ctx: Context): Promise<void> {
  const stats = jobRepository.getStats();

  const message = `
📊 *Iran Design Job Hunter — Statistics*

🌐 *Total Jobs Scanned:* \`${stats.totalJobs}\`
🔥 *High-Match Positions (>=60%):* \`${stats.highMatchJobs}\`
⭐ *Saved / Bookmarked:* \`${stats.savedCount}\`
✅ *Applied / Processed:* \`${stats.appliedCount}\`

🤖 *AI Engine:* Google Gemini 2.5 Flash
🔍 *Sources Monitored:* Jobinja, Jobvision
⏰ *Scanning Frequency:* Every 15 minutes (GitHub Actions 24/7)
`;

  await ctx.reply(message, { parse_mode: 'Markdown' });
}
