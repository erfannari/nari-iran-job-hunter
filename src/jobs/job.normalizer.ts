import crypto from 'crypto';
import { RawJobListing, JobRecord } from './types.js';

export class JobNormalizer {
  /**
   * Normalizes Persian & English characters, removes duplicate spaces and punctuation.
   */
  static normalizeText(text: string): string {
    if (!text) return '';

    return text
      .toLowerCase()
      // Normalize Persian characters
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/هٔ/g, 'ه')
      .replace(/[\u200B-\u200D\uFEFF]/g, ' ') // zero-width spaces to space
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/[^\p{L}\p{N}\s/+-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generates a deterministic SHA-256 fingerprint for deduplication.
   */
  static generateFingerprint(source: string, company: string, title: string): string {
    const normSource = this.normalizeText(source);
    const normCompany = this.normalizeText(company);
    const normTitle = this.normalizeText(title);

    const rawKey = `${normSource}::${normCompany}::${normTitle}`;
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }

  /**
   * Checks if a job posting is older than maxDays (default 40 days).
   */
  static isJobOlderThanDays(
    job: { posted_at?: string | null; discovered_at?: string | null },
    maxDays: number = 40
  ): boolean {
    // 1. Check discovered_at
    if (job.discovered_at) {
      const discTime = new Date(job.discovered_at).getTime();
      if (!isNaN(discTime)) {
        const diffDays = (Date.now() - discTime) / (1000 * 60 * 60 * 24);
        if (diffDays > maxDays) return true;
      }
    }

    // 2. Check posted_at
    if (job.posted_at) {
      const raw = job.posted_at.trim();

      // Check ISO or standard date formats
      const parsedTime = Date.parse(raw);
      if (!isNaN(parsedTime)) {
        const diffDays = (Date.now() - parsedTime) / (1000 * 60 * 60 * 24);
        if (diffDays > maxDays) return true;
      }

      // Convert Persian digits
      const normalized = raw.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));

      // Matches like "2 ماه پیش", "3 ماه قبل", "بیش از ۲ ماه"
      const monthMatch = normalized.match(/(\d+)\s*ماه/);
      if (monthMatch) {
        const months = parseInt(monthMatch[1], 10);
        if (months >= 2) return true; // >= 60 days
        if (months === 1 && (normalized.includes('بیش از') || normalized.includes('بیشتر از'))) return true;
      }

      // Matches like "45 روز پیش", "50 روز قبل"
      const dayMatch = normalized.match(/(\d+)\s*روز/);
      if (dayMatch) {
        const days = parseInt(dayMatch[1], 10);
        if (days > maxDays) return true;
      }

      // Matches like "6 هفته پیش", "8 هفته پیش"
      const weekMatch = normalized.match(/(\d+)\s*هفته/);
      if (weekMatch) {
        const weeks = parseInt(weekMatch[1], 10);
        if (weeks * 7 > maxDays) return true;
      }
    }

    return false;
  }

  /**
   * Transforms raw listing into standard database JobRecord.
   */
  static normalizeListing(raw: RawJobListing): JobRecord {
    const now = new Date().toISOString();
    const normalizedTitle = this.normalizeText(raw.title);
    const normalizedCompany = this.normalizeText(raw.company);
    const fingerprint = this.generateFingerprint(raw.source, raw.company, raw.title);
    const id = `job_${crypto.randomUUID()}`;

    return {
      id,
      source: raw.source,
      source_job_id: raw.sourceJobId || null,
      title: raw.title.trim(),
      normalized_title: normalizedTitle,
      company: raw.company.trim(),
      normalized_company: normalizedCompany,
      location: raw.location ? raw.location.trim() : null,
      description: raw.description.trim(),
      url: raw.url.trim(),
      posted_at: raw.postedAt || null,
      discovered_at: now,
      updated_at: now,
      employment_type: raw.employmentType || null,
      workplace_type: raw.workplaceType || null,
      required_experience_years: raw.requiredExperienceYears ?? null,
      skills: raw.skills ? JSON.stringify(raw.skills) : null,
      profile: null,
      match_score: null,
      match_reason: null,
      status: 'new',
      fingerprint,
    };
  }
}
