import { Context } from 'grammy';

export async function handleHelpCommand(ctx: Context): Promise<void> {
  const helpText = `
📖 *Iran Design Job Hunter Bot — Commands & Help*

🎯 *Job Discovery:*
• /jobs or /design - View latest high-matching UI/UX & Product Design vacancies.
• /latest - Show recently discovered positions.

📂 *Tracking & Management:*
• /saved - Display your saved / bookmarked jobs.
• /applied or /checked - Display jobs you marked as applied.
• /stats - View total jobs scanned, high match count, and metrics.

⚙️ *Customization & Profiles:*
• /settings - Adjust your minimum match score alert threshold.
• /settings <score> - Set threshold directly (e.g., \`/settings 75\`).
• /resume <portfolio_url> <cv_url> - Save your portfolio and CV links.

🤖 *How Scoring Works:*
1. **Rule Pre-filter:** Filters out non-design roles (pure coding, print shops, 3D, interior) and boosts core design tools (Figma, Design Systems, UX Research).
2. **Gemini 2.5 Flash:** Evaluates job descriptions for semantic fit, design depth, and experience match.
3. **Alert Threshold:** Only vacancies matching >= your threshold will trigger real-time notifications.
`;

  await ctx.reply(helpText, { parse_mode: 'Markdown' });
}
