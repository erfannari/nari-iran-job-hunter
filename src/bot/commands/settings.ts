import { Context } from 'grammy';
import { jobRepository } from '../../database/job.repository.js';

export async function handleSettingsCommand(ctx: Context): Promise<void> {
  const chatId = String(ctx.chat?.id);
  const user = jobRepository.getUser(chatId);
  const text = ctx.message?.text || '';
  const args = text.split(/\s+/).slice(1);

  if (args.length > 0) {
    const newScore = parseFloat(args[0]);
    if (!isNaN(newScore) && newScore >= 0 && newScore <= 100) {
      jobRepository.updateUserMinScore(chatId, newScore);
      await ctx.reply(`⚙️ *Settings Updated!*\nMinimum match score threshold set to *${newScore}%*.`, {
        parse_mode: 'Markdown',
      });
      return;
    } else {
      await ctx.reply('⚠️ Please provide a valid score between 0 and 100. Example: `/settings 75`', {
        parse_mode: 'Markdown',
      });
      return;
    }
  }

  const currentScore = user?.min_score ?? 60;
  const message = `
⚙️ *Hunter Notification Settings*

🎯 *Current Minimum Match Score:* \`${currentScore}%\`
Only vacancies evaluated at or above this score will trigger push notifications.

To change your threshold, send:
\`/settings <number>\` (e.g., \`/settings 70\` or \`/settings 80\`)
`;

  await ctx.reply(message, { parse_mode: 'Markdown' });
}
