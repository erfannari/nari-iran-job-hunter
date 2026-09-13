import { InlineKeyboard } from 'grammy';
import { JobRecord, AIAnalysisResult } from '../../jobs/types.js';

export class JobFormatter {
  static formatJobCard(job: JobRecord): string {
    let ai: AIAnalysisResult | null = null;
    if (job.match_reason) {
      try {
        ai = JSON.parse(job.match_reason);
      } catch {
        ai = null;
      }
    }

    const score = job.match_score ?? 70;
    const scoreEmoji = score >= 85 ? '🟪 🎨' : score >= 70 ? '🟣 🎨' : '🔹 🎨';
    const recText = ai?.recommendation ? `⭐ *${ai.recommendation}*` : score >= 80 ? '⭐ *STRONGLY APPLY*' : '👍 *APPLY*';

    // Parse tools/skills
    let skillsDisplay = 'Figma · Design Systems · User Research';
    if (job.skills) {
      try {
        const parsed = JSON.parse(job.skills);
        if (Array.isArray(parsed) && parsed.length > 0) {
          skillsDisplay = parsed.slice(0, 5).join(' · ');
        }
      } catch {
        skillsDisplay = job.skills;
      }
    }

    const expText = job.required_experience_years
      ? `${job.required_experience_years}+ years`
      : '1–4 years (Target profile)';

    const lines: string[] = [
      `${scoreEmoji} *UI/UX & DESIGN — ${score}% MATCH* 🟣`,
      `> 🎨 *${this.escapeMarkdown(job.title)}*`,
      '',
      `🏢 *Studio / Company:* ${this.escapeMarkdown(job.company)}`,
      `📍 *Location:* ${this.escapeMarkdown(job.location || 'Iran / Remote')}`,
      `🕐 *Posted:* ${this.escapeMarkdown(job.posted_at || 'Recently')}`,
      `✨ *Design Tools:* _${this.escapeMarkdown(skillsDisplay)}_`,
      `⏳ *Experience:* ${expText}`,
      '',
    ];

    if (ai?.fitLevel) {
      lines.push(
        '🟣 *Design Fit Breakdown:*',
        `💜 Design Skills — ${ai.fitLevel.designSkills || 'Good Match'}`,
        `💜 Experience — ${ai.fitLevel.experience || 'Ideal Level'}`,
        ''
      );
    }

    lines.push(`🎯 *Recommendation:* ${recText}`, '');

    if (ai?.reasons && ai.reasons.length > 0) {
      lines.push('💡 *Why it fits your profile:*');
      for (const r of ai.reasons.slice(0, 3)) {
        lines.push(`🔸 ${this.escapeMarkdown(r)}`);
      }
      lines.push('');
    } else {
      lines.push(
        '💡 *Why it fits your profile:*',
        `🔸 Target Design role matched in title: "${this.escapeMarkdown(job.title)}"`,
        '🔸 Relevant skills match UI/UX & Product Design profile',
        ''
      );
    }

    if (ai?.concerns && ai.concerns.length > 0) {
      lines.push('⚠️ *Notes:*');
      for (const c of ai.concerns.slice(0, 2)) {
        lines.push(`▫️ ${this.escapeMarkdown(c)}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  static createJobKeyboard(job: JobRecord): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    // Row 1: Direct Apply link button
    keyboard.url('🎨 Apply (Design) ↗', job.url);
    keyboard.row();

    // Row 2: Mark Checked / Applied button
    if (job.status === 'applied') {
      keyboard.text('✅ Applied (Click to undo)', `action:unapply:${job.id}`);
    } else {
      keyboard.text('✅ Mark Checked / Applied', `action:apply:${job.id}`);
    }
    keyboard.row();

    // Row 3: Save / Ignore
    if (job.status === 'saved') {
      keyboard.text('⭐ Saved ✓', `action:unsave:${job.id}`);
    } else {
      keyboard.text('⭐ Save', `action:save:${job.id}`);
    }

    keyboard.text('❌ Ignore', `action:ignore:${job.id}`);

    return keyboard;
  }

  private static escapeMarkdown(text: string): string {
    if (!text) return '';
    return text.replace(/([_*\[\]()~`>#+=|{}.!-])/g, '\\$1');
  }
}
