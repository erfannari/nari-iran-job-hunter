import { Context } from 'grammy';
import { jobRepository } from '../../database/job.repository.js';

export async function handleResumeCommand(ctx: Context): Promise<void> {
  const chatId = String(ctx.chat?.id);
  const text = ctx.message?.text || '';
  const args = text.split(/\s+/).slice(1);

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

  const message = `
💼 *Your Portfolio & CV Links*

🎨 *Portfolio URL:* ${portfolio}
📄 *CV / Resume URL:* ${cv}

To update your links, send:
\`/resume <portfolio_link> [cv_link]\`
Example:
\`/resume https://dribbble.com/myname https://drive.google.com/cv.pdf\`
`;

  await ctx.reply(message, { parse_mode: 'Markdown' });
}
