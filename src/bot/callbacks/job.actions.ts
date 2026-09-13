import { Context } from 'grammy';
import { jobRepository } from '../../database/job.repository.js';
import { JobFormatter } from '../formatters/job.formatter.js';
import { logger } from '../../utils/logger.js';

export async function handleJobActionCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data || !data.startsWith('action:')) return;

  const parts = data.split(':');
  const action = parts[1];
  const jobId = parts[2];
  const chatId = ctx.chat?.id ? String(ctx.chat.id) : '';

  const job = jobRepository.getJobById(jobId);
  if (!job) {
    await ctx.answerCallbackQuery({ text: '⚠️ Job listing not found.', show_alert: true });
    return;
  }

  try {
    switch (action) {
      case 'apply':
        jobRepository.updateJobStatus(jobId, 'applied');
        jobRepository.recordUserJobAction(chatId, jobId, 'applied');
        await ctx.answerCallbackQuery({ text: '✅ Marked as Applied!' });
        break;

      case 'unapply':
        jobRepository.updateJobStatus(jobId, 'new');
        jobRepository.recordUserJobAction(chatId, jobId, 'unapply');
        await ctx.answerCallbackQuery({ text: 'Applied status removed.' });
        break;

      case 'save':
        jobRepository.updateJobStatus(jobId, 'saved');
        jobRepository.recordUserJobAction(chatId, jobId, 'save');
        await ctx.answerCallbackQuery({ text: '⭐ Job saved to bookmarks!' });
        break;

      case 'unsave':
        jobRepository.updateJobStatus(jobId, 'new');
        jobRepository.recordUserJobAction(chatId, jobId, 'unsave');
        await ctx.answerCallbackQuery({ text: 'Removed from bookmarks.' });
        break;

      case 'ignore':
        jobRepository.updateJobStatus(jobId, 'ignored');
        jobRepository.recordUserJobAction(chatId, jobId, 'ignore');
        await ctx.answerCallbackQuery({ text: '❌ Job ignored.' });
        if (ctx.callbackQuery.message) {
          await ctx.deleteMessage();
        }
        return;

      default:
        await ctx.answerCallbackQuery({ text: 'Unknown action.' });
        return;
    }

    // Refresh keyboard on the message
    const updatedJob = jobRepository.getJobById(jobId);
    if (updatedJob && ctx.callbackQuery.message) {
      const keyboard = JobFormatter.createJobKeyboard(updatedJob);
      await ctx.editMessageReplyMarkup({ reply_markup: keyboard });
    }
  } catch (error) {
    logger.error('Error handling callback action', error);
    await ctx.answerCallbackQuery({ text: 'An error occurred.' });
  }
}
