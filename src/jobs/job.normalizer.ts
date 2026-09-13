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
