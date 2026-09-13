import { Context } from 'grammy';
import { jobRepository } from '../../database/job.repository.js';

export async function handleStartCommand(ctx: Context): Promise<void> {
  const chatId = String(ctx.chat?.id);
  const username = ctx.from?.username;
  const firstName = ctx.from?.first_name;

  jobRepository.upsertUser(chatId, username, firstName);

  const welcomeMessage = `
🎨 *Welcome to Iran Design Job Hunter Bot!* 🇮🇷

I am your 24/7 automated hunter for **UI/UX & Product Design** positions across Iranian job portals (Jobinja, Jobvision, and more).

✨ *Features:*
🟣 *Design-Only Intelligence:* Tailored for Product Designers (1-2 yrs) & UI/UX Designers (3-4 yrs).
🤖 *Gemini 2.5 Flash Evaluation:* Deep semantic analysis and fit scoring for every job listing.
⚡ *Instant Alerts:* Real-time notifications with direct Apply links & 1-click tracking.

📋 *Available Commands:*
• /jobs or /design - View top matching design vacancies
• /saved - View your bookmarked jobs
• /applied - View jobs you have marked as applied
• /stats - View scanner & hunting statistics
• /settings - Customize minimum match score threshold
• /resume - Save your portfolio and CV links for quick access
• /help - Bot usage guide & assistance

🔔 You are now subscribed to automated high-match alerts!
`;

  await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
}
