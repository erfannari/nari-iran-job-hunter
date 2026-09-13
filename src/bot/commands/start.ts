import { Context } from 'grammy';
import { jobRepository } from '../../database/job.repository.js';
import { createMainMenuKeyboard } from '../keyboards/main.menu.js';

export async function handleStartCommand(ctx: Context): Promise<void> {
  const chatId = String(ctx.chat?.id);
  const username = ctx.from?.username;
  const firstName = ctx.from?.first_name || 'Designer';

  jobRepository.upsertUser(chatId, username, firstName);

  const welcomeMessage = `🎨 <b>Welcome, ${firstName}!</b> 🇮🇷
<b>Iran UI/UX & Product Design Job Hunter</b>

⚡ <b>24/7 Automated Hunter:</b> Scans Jobinja & Jobvision every 5 mins.
🤖 <b>Gemini AI:</b> Scores each vacancy for UI/UX & Product Design fit.
🔔 <b>Instant Alerts:</b> Sends new high-matching jobs directly to you.

👇 <b>Use the menu below to navigate:</b>`;

  await ctx.reply(welcomeMessage, {
    parse_mode: 'HTML',
    reply_markup: createMainMenuKeyboard(),
  });
}
