import { Bot } from 'grammy';
import { sourceRegistry } from '../sources/source.registry.js';
import { JobNormalizer } from './job.normalizer.js';
import { jobScorer } from './job.scorer.js';
import { jobRepository } from '../database/job.repository.js';
import { JobFormatter } from '../bot/formatters/job.formatter.js';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { JobRecord } from './types.js';

export class JobService {
  /**
   * Runs the full job hunting cycle: Scrape -> Normalize -> Score -> Store -> Notify
   */
  async runHuntingCycle(bot?: Bot): Promise<{ scanned: number; newJobs: number; highMatches: number; notified: number }> {
    logger.info('🚀 Starting Iran Design Job hunting cycle...');

    const rawListings = await sourceRegistry.fetchAllSources();
    let newJobsCount = 0;
    let highMatchesCount = 0;
    let notifiedCount = 0;

    for (const raw of rawListings) {
      try {
        const normalized = JobNormalizer.normalizeListing(raw);

        // Discard older than 40 days immediately
        if (JobNormalizer.isJobOlderThanDays(normalized, 40)) {
          continue;
        }

        const existing = jobRepository.getJobByFingerprint(normalized.fingerprint);

        let jobToScore: JobRecord;

        if (existing) {
          jobToScore = existing;
        } else {
          newJobsCount++;
          jobRepository.insertOrUpdateJob(normalized);
          jobToScore = normalized;
        }

        // Score the job
        const scoringResult = await jobScorer.scoreJob(
          jobToScore,
          existing?.match_score,
          existing?.match_reason
        );

        // Update score in DB
        const matchReasonJson = scoringResult.aiAnalysis
          ? JSON.stringify(scoringResult.aiAnalysis)
          : JSON.stringify({ summary: scoringResult.reasonSummary });

        jobRepository.updateJobScore(
          jobToScore.id,
          scoringResult.finalScore,
          matchReasonJson,
          'UI/UX & Product Design'
        );

        if (scoringResult.finalScore >= 60) {
          highMatchesCount++;
        }
      } catch (err) {
        logger.error(`Failed processing raw job: ${raw.title}`, err);
      }
    }

    // Notify registered users
    if (bot) {
      notifiedCount = await this.dispatchNotifications(bot);
    }

    logger.info(`✅ Cycle complete: Scanned=${rawListings.length}, New=${newJobsCount}, HighMatches=${highMatchesCount}, Notified=${notifiedCount}`);
    return {
      scanned: rawListings.length,
      newJobs: newJobsCount,
      highMatches: highMatchesCount,
      notified: notifiedCount,
    };
  }

  /**
   * Dispatches unnotified matching jobs to active users.
   */
  async dispatchNotifications(bot: Bot): Promise<number> {
    const activeUsers = jobRepository.getActiveUsers();
    let totalNotified = 0;

    // Also include default TELEGRAM_CHAT_ID if set and not in DB
    const targetChatIds = new Set<string>();
    for (const u of activeUsers) {
      targetChatIds.add(u.chat_id);
    }
    if (config.TELEGRAM_CHAT_ID) {
      targetChatIds.add(config.TELEGRAM_CHAT_ID);
    }

    for (const chatId of targetChatIds) {
      const user = jobRepository.getUser(chatId);
      const minScore = user?.min_score ?? config.MIN_MATCH_SCORE;
      const unnotifiedJobs = jobRepository.getUnnotifiedJobs(chatId, minScore, 40);

      logger.info(`Dispatching ${unnotifiedJobs.length} new jobs to chat_id: ${chatId}`);

      // Reverse so the highest score (best match) is delivered last and appears at the bottom of the chat
      const jobsToSend = [...unnotifiedJobs].reverse();

      for (const job of jobsToSend) {
        try {
          const cardText = JobFormatter.formatJobCard(job);
          const keyboard = JobFormatter.createJobKeyboard(job);

          const sentMsg = await bot.api.sendMessage(chatId, cardText, {
            parse_mode: 'Markdown',
            reply_markup: keyboard,
            link_preview_options: { is_disabled: true },
          });

          jobRepository.recordNotification(job.id, chatId, sentMsg.message_id);
          totalNotified++;

          // Small sleep to avoid Telegram rate limits
          await new Promise((resolve) => setTimeout(resolve, 350));
        } catch (error) {
          logger.error(`Failed sending job notification [${job.id}] to chat [${chatId}]`, error);
        }
      }
    }

    return totalNotified;
  }
}

export const jobService = new JobService();
