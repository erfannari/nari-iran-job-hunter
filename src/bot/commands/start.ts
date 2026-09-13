import { Context } from 'grammy';
import { jobRepository } from '../../database/job.repository.js';
import { createMainMenuKeyboard } from '../keyboards/main.menu.js';

export async function handleStartCommand(ctx: Context): Promise<void> {
  const chatId = String(ctx.chat?.id);
  const username = ctx.from?.username;
  const firstName = ctx.from?.first_name || 'Designer';

  jobRepository.upsertUser(chatId, username, firstName);

  const welcomeMessage = `
🎨 *Welcome, ${firstName}!* 🇮🇷
*Iran UI/UX & Product Design Job Hunter Bot*

I am your 24/7 automated intelligence bot dedicated exclusively to finding the best **Product Design, UI/UX, and UX Research** vacancies across top Iranian portals (Jobinja, Jobvision, and more).

✨ *How it works:*
1. 🔍 *Continuous Scanning:* Scrapes the latest postings 24/7 every 15 minutes.
2. 🤖 *Gemini AI Evaluation:* Uses Google Gemini AI to analyze job requirements, design depth, and experience match.
3. ⚡ *Instant Alerts:* Delivers curated job cards with direct *Apply* links and match breakdowns.

🚀 *Quick Navigation:*
Use the bottom menu buttons or send any of these commands:
• 🎨 *Top Design Jobs* (\`/jobs\`) - View high-matching vacancies
• ⭐ *Saved Jobs* (\`/saved\`) - Review your bookmarked jobs
• ✅ *Applied Tracker* (\`/applied\`) - Track positions you applied to
• 📊 *Statistics* (\`/stats\`) - Scanner & market metrics
• ⚙️ *Settings* (\`/settings\`) - Customize alert match score threshold
• 💼 *Portfolio / CV* (\`/resume\`) - Save your portfolio and CV links
• 📖 *Help & Guide* (\`/help\`) - Commands reference

🔔 *You are actively subscribed to receive new design job alerts!*
`;

  await ctx.reply(welcomeMessage, {
    parse_mode: 'Markdown',
    reply_markup: createMainMenuKeyboard(),
  });
}
