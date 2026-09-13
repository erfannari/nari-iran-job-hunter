import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

let dbInstance: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const dataDir = path.resolve(config.DATA_DIR);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'jobs.db');
  dbInstance = new Database(dbPath);

  // Enable WAL mode for high concurrency & reliability
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  initSchema(dbInstance);
  logger.info(`Database initialized successfully at ${dbPath}`);

  return dbInstance;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      source_job_id TEXT,
      title TEXT NOT NULL,
      normalized_title TEXT NOT NULL,
      company TEXT NOT NULL,
      normalized_company TEXT NOT NULL,
      location TEXT,
      description TEXT NOT NULL,
      url TEXT NOT NULL,
      posted_at TEXT,
      discovered_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      employment_type TEXT,
      workplace_type TEXT,
      required_experience_years REAL,
      skills TEXT,
      profile TEXT,
      match_score REAL,
      match_reason TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      fingerprint TEXT NOT NULL UNIQUE
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_fingerprint ON jobs(fingerprint);
    CREATE INDEX IF NOT EXISTS idx_jobs_match_score ON jobs(match_score);
    CREATE INDEX IF NOT EXISTS idx_jobs_discovered_at ON jobs(discovered_at);
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

    CREATE TABLE IF NOT EXISTS job_notifications (
      job_id TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      message_id INTEGER,
      PRIMARY KEY (job_id, chat_id)
    );

    CREATE TABLE IF NOT EXISTS user_state (
      chat_id TEXT PRIMARY KEY,
      username TEXT,
      first_name TEXT,
      is_active INTEGER DEFAULT 1,
      min_score REAL DEFAULT 60,
      portfolio_url TEXT,
      cv_url TEXT,
      created_at TEXT NOT NULL,
      last_active_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_job_actions (
      chat_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (chat_id, job_id, action)
    );
  `);
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
