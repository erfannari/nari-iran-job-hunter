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

    // Parse tools/skills
    let skillsDisplay = '';
    if (job.skills) {
      try {
        const parsed = JSON.parse(job.skills);
        if (Array.isArray(parsed) && parsed.length > 0) {
          skillsDisplay = parsed.slice(0, 4).join(' · ');
        }
      } catch {
        skillsDisplay = job.skills;
      }
    }

    const expText = job.required_experience_years
      ? `${job.required_experience_years}+ yrs`
      : 'Mid / Senior';

    const sourceBadge = job.source === 'jobvision' ? 'Jobvision' : 'Jobinja';
    const loc = (job.location || 'Iran / Remote').trim();
    const company = (job.company || 'Company').trim();

    const lines: string[] = [
      `${badge} <b>${score}%</b> — <i>${sourceBadge}</i>`,
      `🎨 <b>${this.escapeHtml(job.title)}</b>`,
      `🏢 <b>${this.escapeHtml(company)}</b> · 📍 ${this.escapeHtml(loc)} · ⏳ ${expText}`,
    ];

    if (skillsDisplay) {
      lines.push(`🛠 <code>${this.escapeHtml(skillsDisplay)}</code>`);
    }

    // AI insight summary (concise 1 line)
    if (ai?.reasons && ai.reasons.length > 0) {
      lines.push(`💡 <i>${this.escapeHtml(ai.reasons[0])}</i>`);
    } else if (ai?.recommendation) {
      lines.push(`💡 <i>${this.escapeHtml(ai.recommendation)}</i>`);
    }

    return lines.join('\n');
  }

  static createJobKeyboard(job: JobRecord): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    // Row 1: Direct Apply link & Bookmark button
    keyboard.url('🎨 Apply ↗', job.url);
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

