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
    const badge = score >= 85 ? '🟣 <b>[TOP MATCH]</b>' : score >= 70 ? '🔹 <b>[GOOD MATCH]</b>' : '▫️ <b>[MATCH]</b>';

    // Parse & sanitize skills
    let cleanSkills: string[] = [];
    if (job.skills) {
      try {
        const parsed = JSON.parse(job.skills);
        if (Array.isArray(parsed)) {
          const skipPatterns = ['دسته بندی', 'موقعیت', 'نوع همکاری', 'سابقه کار', 'حقوق', 'جنسیت', 'سربازی'];
          cleanSkills = parsed
            .map((s: string) => String(s).replace(/\s+/g, ' ').trim())
            .filter((s: string) => s.length > 1 && s.length <= 30 && !skipPatterns.some((p) => s.includes(p)));
        }
      } catch {
        // Not JSON
      }
    }

    const expText = job.required_experience_years
      ? `${job.required_experience_years}+ years`
      : 'Mid / Senior';

    const sourceBadge = job.source === 'jobvision' ? 'Jobvision' : 'Jobinja';
    const loc = (job.location || 'ایران').replace(/\s+/g, ' ').trim();
    const company = (job.company || 'شرکت محرمانه').replace(/\s+/g, ' ').trim();

    const lines: string[] = [
      `${badge} <b>${score}%</b> · <i>${sourceBadge}</i>`,
      `💼 <b>${this.escapeHtml(job.title.replace(/\s+/g, ' ').trim())}</b>`,
      '',
      `🏢 <b>Company:</b> ${this.escapeHtml(company)}`,
      `📍 <b>Location:</b> ${this.escapeHtml(loc)}`,
      `⏳ <b>Level:</b> ${expText}`,
    ];

    if (cleanSkills.length > 0) {
      lines.push(`🛠 <b>Skills:</b> ${this.escapeHtml(cleanSkills.slice(0, 4).join(' · '))}`);
    }

    // AI insight summary
    if (ai?.reasons && ai.reasons.length > 0) {
      const reason = ai.reasons[0].replace(/\s+/g, ' ').trim();
      lines.push('', `💡 <i>${this.escapeHtml(reason)}</i>`);
    } else if (ai?.recommendation) {
      lines.push('', `💡 <i>${this.escapeHtml(ai.recommendation.replace(/\s+/g, ' ').trim())}</i>`);
    }

    return lines.join('\n');
  }

  static createJobKeyboard(job: JobRecord): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    // Row 1: Direct Apply link & Bookmark button
    keyboard.url('🔗 Apply ↗', job.url);
    if (job.status === 'saved') {
      keyboard.text('⭐ Saved ✓', `action:unsave:${job.id}`);
    } else {
      keyboard.text('⭐ Save', `action:save:${job.id}`);
    }
    keyboard.row();

    // Row 2: Mark applied & Dismiss
    if (job.status === 'applied') {
      keyboard.text('✅ Applied (Undo)', `action:unapply:${job.id}`);
    } else {
      keyboard.text('✅ Mark Applied', `action:apply:${job.id}`);
    }
    keyboard.text('❌ Dismiss', `action:ignore:${job.id}`);

    return keyboard;
  }

  static escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}


