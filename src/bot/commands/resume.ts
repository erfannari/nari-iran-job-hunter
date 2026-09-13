import { Context, InputFile } from 'grammy';
import fs from 'fs';
import path from 'path';
import { jobRepository } from '../../database/job.repository.js';
import { logger } from '../../utils/logger.js';

export async function handleResumeCommand(ctx: Context): Promise<void> {
  const chatId = String(ctx.chat?.id);
  const text = ctx.message?.text || '';
  const args = text.split(/\s+/).slice(1);

  // If user provided a custom portfolio/cv link
  if (args.length > 0) {
    const portfolioUrl = args[0];
    const cvUrl = args[1] || '';

    jobRepository.updateUserLinks(chatId, portfolioUrl, cvUrl || undefined);
    await ctx.reply(
      `🔗 *Profile Links Saved!*\n• Portfolio: ${portfolioUrl}\n${cvUrl ? `• CV: ${cvUrl}` : ''}`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const user = jobRepository.getUser(chatId);
  const portfolio = user?.portfolio_url || '_Not set_';
  const cv = user?.cv_url || '_Not set_';

  // Check if Fatemeh-Khaji.pdf is available on disk
  const defaultPdfPath = path.resolve(process.cwd(), 'Fatemeh-Khaji.pdf');

  if (fs.existsSync(defaultPdfPath)) {
    try {
      await ctx.replyWithDocument(new InputFile(defaultPdfPath, 'Fatemeh-Khaji-UIUX-Resume.pdf'), {
        caption: `📄 *Fatemeh Khaji — Product & UI/UX Designer Resume*\n\n🎨 *Portfolio:* ${portfolio}\n\n💡 _To update your portfolio URL, send:_\n\`/resume <portfolio_link>\``,
        parse_mode: 'Markdown',
      });
      return;
    } catch (err) {
      logger.error('Failed sending resume PDF document', err);
    }
  }

  const message = `
💼 *Portfolio & CV Center*

🎨 *Portfolio URL:* ${portfolio}
📄 *CV / Resume URL:* ${cv}

To save your portfolio link, send:
\`/resume <portfolio_link>\`
Example:
\`/resume https://dribbble.com/myportfolio\`
`;

  await ctx.reply(message, { parse_mode: 'Markdown' });
}
