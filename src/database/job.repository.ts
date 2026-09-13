import { getDatabase } from './db.js';
import { JobRecord, UserStateRecord } from '../jobs/types.js';

export class JobRepository {
  private get db() {
    return getDatabase();
  }

  insertOrUpdateJob(job: JobRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO jobs (
        id, source, source_job_id, title, normalized_title,
        company, normalized_company, location, description,
        url, posted_at, discovered_at, updated_at,
        employment_type, workplace_type, required_experience_years,
        skills, profile, match_score, match_reason, status, fingerprint
      ) VALUES (
        @id, @source, @source_job_id, @title, @normalized_title,
        @company, @normalized_company, @location, @description,
        @url, @posted_at, @discovered_at, @updated_at,
        @employment_type, @workplace_type, @required_experience_years,
        @skills, @profile, @match_score, @match_reason, @status, @fingerprint
      )
      ON CONFLICT(fingerprint) DO UPDATE SET
        title = excluded.title,
        company = excluded.company,
        location = excluded.location,
        description = excluded.description,
        url = excluded.url,
        posted_at = coalesce(excluded.posted_at, jobs.posted_at),
        updated_at = excluded.updated_at,
        employment_type = excluded.employment_type,
        workplace_type = excluded.workplace_type,
        required_experience_years = excluded.required_experience_years,
        skills = excluded.skills,
        profile = excluded.profile,
        match_score = coalesce(excluded.match_score, jobs.match_score),
        match_reason = coalesce(excluded.match_reason, jobs.match_reason)
    `);

    stmt.run({
      ...job,
      source_job_id: job.source_job_id ?? null,
      location: job.location ?? null,
      posted_at: job.posted_at ?? null,
      employment_type: job.employment_type ?? null,
      workplace_type: job.workplace_type ?? null,
      required_experience_years: job.required_experience_years ?? null,
      skills: job.skills ?? null,
      profile: job.profile ?? null,
      match_score: job.match_score ?? null,
      match_reason: job.match_reason ?? null,
    });
  }

  getJobById(id: string): JobRecord | undefined {
    const stmt = this.db.prepare('SELECT * FROM jobs WHERE id = ?');
    return stmt.get(id) as JobRecord | undefined;
  }

  getJobByFingerprint(fingerprint: string): JobRecord | undefined {
    const stmt = this.db.prepare('SELECT * FROM jobs WHERE fingerprint = ?');
    return stmt.get(fingerprint) as JobRecord | undefined;
  }

  updateJobScore(id: string, matchScore: number, matchReason: string, profile: string): void {
    const stmt = this.db.prepare(`
      UPDATE jobs
      SET match_score = ?, match_reason = ?, profile = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(matchScore, matchReason, profile, new Date().toISOString(), id);
  }

  updateJobStatus(id: string, status: JobRecord['status']): void {
    const stmt = this.db.prepare('UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?');
    stmt.run(status, new Date().toISOString(), id);
  }

  getRecentHighMatchingJobs(minScore: number = 60, limit: number = 20): JobRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM jobs
      WHERE match_score >= ?
      ORDER BY match_score DESC, discovered_at DESC
      LIMIT ?
    `);
    return stmt.all(minScore, limit) as JobRecord[];
  }

  getSavedJobs(limit: number = 20): JobRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM jobs
      WHERE status = 'saved'
      ORDER BY updated_at DESC
      LIMIT ?
    `);
    return stmt.all(limit) as JobRecord[];
  }

  getAppliedJobs(limit: number = 20): JobRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM jobs
      WHERE status = 'applied'
      ORDER BY updated_at DESC
      LIMIT ?
    `);
    return stmt.all(limit) as JobRecord[];
  }

  getUnnotifiedJobs(chatId: string, minScore: number = 60): JobRecord[] {
    const stmt = this.db.prepare(`
      SELECT j.* FROM jobs j
      LEFT JOIN job_notifications n ON j.id = n.job_id AND n.chat_id = ?
      WHERE n.job_id IS NULL
        AND j.match_score >= ?
        AND j.status != 'ignored'
      ORDER BY j.match_score DESC, j.discovered_at DESC
    `);
    return stmt.all(chatId, minScore) as JobRecord[];
  }

  recordNotification(jobId: string, chatId: string, messageId?: number): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO job_notifications (job_id, chat_id, sent_at, message_id)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(jobId, chatId, new Date().toISOString(), messageId ?? null);
  }

  // User State CRUD
  upsertUser(chatId: string, username?: string, firstName?: string): UserStateRecord {
    const existing = this.getUser(chatId);
    const now = new Date().toISOString();

    if (existing) {
      const stmt = this.db.prepare(`
        UPDATE user_state
        SET username = coalesce(?, username),
            first_name = coalesce(?, first_name),
            last_active_at = ?
        WHERE chat_id = ?
      `);
      stmt.run(username ?? null, firstName ?? null, now, chatId);
      return { ...existing, username: username ?? existing.username, first_name: firstName ?? existing.first_name, last_active_at: now };
    } else {
      const stmt = this.db.prepare(`
        INSERT INTO user_state (chat_id, username, first_name, is_active, min_score, created_at, last_active_at)
        VALUES (?, ?, ?, 1, 60, ?, ?)
      `);
      stmt.run(chatId, username ?? null, firstName ?? null, now, now);
      return {
        chat_id: chatId,
        username: username ?? null,
        first_name: firstName ?? null,
        is_active: 1,
        min_score: 60,
        portfolio_url: null,
        cv_url: null,
        created_at: now,
        last_active_at: now,
      };
    }
  }

  getUser(chatId: string): UserStateRecord | undefined {
    const stmt = this.db.prepare('SELECT * FROM user_state WHERE chat_id = ?');
    return stmt.get(chatId) as UserStateRecord | undefined;
  }

  getActiveUsers(): UserStateRecord[] {
    const stmt = this.db.prepare('SELECT * FROM user_state WHERE is_active = 1');
    return stmt.all() as UserStateRecord[];
  }

  updateUserMinScore(chatId: string, minScore: number): void {
    const stmt = this.db.prepare('UPDATE user_state SET min_score = ?, last_active_at = ? WHERE chat_id = ?');
    stmt.run(minScore, new Date().toISOString(), chatId);
  }

  updateUserLinks(chatId: string, portfolioUrl?: string, cvUrl?: string): void {
    const stmt = this.db.prepare(`
      UPDATE user_state
      SET portfolio_url = coalesce(?, portfolio_url),
          cv_url = coalesce(?, cv_url),
          last_active_at = ?
      WHERE chat_id = ?
    `);
    stmt.run(portfolioUrl ?? null, cvUrl ?? null, new Date().toISOString(), chatId);
  }

  recordUserJobAction(chatId: string, jobId: string, action: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_job_actions (chat_id, job_id, action, created_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(chatId, jobId, action, new Date().toISOString());
  }

  getStats(): { totalJobs: number; highMatchJobs: number; appliedCount: number; savedCount: number } {
    const totalJobs = (this.db.prepare('SELECT COUNT(*) as count FROM jobs').get() as { count: number }).count;
    const highMatchJobs = (this.db.prepare('SELECT COUNT(*) as count FROM jobs WHERE match_score >= 60').get() as { count: number }).count;
    const appliedCount = (this.db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'applied'").get() as { count: number }).count;
    const savedCount = (this.db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'saved'").get() as { count: number }).count;

    return { totalJobs, highMatchJobs, appliedCount, savedCount };
  }
}

export const jobRepository = new JobRepository();
