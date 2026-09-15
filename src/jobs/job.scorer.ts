import { DESIGN_PROFILE } from './profiles.js';
import { JobRecord, JobScoringResult, AIAnalysisResult } from './types.js';
import { jobAnalyzer } from '../ai/analyzer.js';
import { logger } from '../utils/logger.js';

export class JobScorer {
  /**
   * Fast rule-based heuristic scoring (0 to 100).
   */
  calculateHeuristicScore(job: JobRecord): { score: number; reasons: string[]; isDisqualified: boolean } {
    const reasons: string[] = [];
    let score = 0;
    const titleLower = job.normalized_title;
    const descLower = job.description.toLowerCase();
    const skillsLower = (job.skills || '').toLowerCase();
    const fullText = `${titleLower} ${descLower} ${skillsLower}`;

    // 1. Check Negative Keywords (Disqualification / Heavy Penalty)
    for (const neg of DESIGN_PROFILE.negativeKeywords) {
      const negLower = neg.toLowerCase();
      if (titleLower.includes(negLower)) {
        return {
          score: 10,
          reasons: [`Disqualified due to negative title keyword: "${neg}"`],
          isDisqualified: true,
        };
      }
    }

    // 2. Check Location (Must be Tehran or Remote)
    const locLower = (job.location || '').toLowerCase();
    const isRemote =
      (job.workplace_type || '').toLowerCase().includes('remote') ||
      locLower.includes('دورکاری') ||
      locLower.includes('remote');
    const isTehran = locLower.includes('تهران') || locLower.includes('tehran');

    if (!isTehran && !isRemote && job.location) {
      for (const dis of DESIGN_PROFILE.disallowedLocations) {
        if (locLower.includes(dis.toLowerCase())) {
          return {
            score: 0,
            reasons: [`Disqualified due to non-Tehran location: "${job.location}"`],
            isDisqualified: true,
          };
        }
      }
    }

    // 3. Exact or Strong Title Match
    let matchedTitle = false;
    for (const target of DESIGN_PROFILE.targetTitles) {
      if (titleLower.includes(target)) {
        score += 35;
        reasons.push(`Target English design title: "${target}"`);
        matchedTitle = true;
        break;
      }
    }

    if (!matchedTitle) {
      for (const persian of DESIGN_PROFILE.persianTitles) {
        if (titleLower.includes(persian) || fullText.includes(persian)) {
          score += 35;
          reasons.push(`Target Persian design title: "${persian}"`);
          matchedTitle = true;
          break;
        }
      }
    }

    // Generic UI / UX / Product keywords in title
    if (!matchedTitle && (titleLower.includes('designer') || titleLower.includes('طراح') || titleLower.includes('ux') || titleLower.includes('ui'))) {
      score += 20;
      reasons.push('General design keyword in job title');
    }

    // 3. Core Skills Match
    let matchedSkillsCount = 0;
    for (const skill of DESIGN_PROFILE.coreSkills) {
      if (fullText.includes(skill)) {
        matchedSkillsCount++;
        if (matchedSkillsCount <= 4) {
          score += 7; // up to ~28 pts
          reasons.push(`Core skill matched: ${skill}`);
        }
      }
    }

    // 4. Bonus Skills Match
    for (const bonus of DESIGN_PROFILE.bonusSkills) {
      if (fullText.includes(bonus)) {
        score += 3;
        reasons.push(`Bonus skill matched: ${bonus}`);
        break;
      }
    }

    // 5. Experience alignment
    if (job.required_experience_years !== null && job.required_experience_years !== undefined) {
      if (
        job.required_experience_years >= DESIGN_PROFILE.targetExperienceYears.min &&
        job.required_experience_years <= DESIGN_PROFILE.targetExperienceYears.max + 1
      ) {
        score += 15;
        reasons.push(`Experience requirement (${job.required_experience_years} yrs) matches target (1-4 yrs)`);
      } else if (job.required_experience_years <= 1) {
        score += 10;
        reasons.push('Entry to mid level experience requirement');
      }
    } else {
      score += 10; // No strict experience barrier
    }

    // Cap between 0 and 100
    const finalHeuristicScore = Math.min(Math.max(score, 0), 100);
    return {
      score: finalHeuristicScore,
      reasons,
      isDisqualified: false,
    };
  }

  /**
   * Full hybrid evaluation combining rule heuristics and Gemini AI analysis.
   */
  async scoreJob(job: JobRecord, existingScore?: number | null, existingReason?: string | null): Promise<JobScoringResult> {
    // 1. Check if previously scored to save AI quota
    if (existingScore !== null && existingScore !== undefined && existingReason) {
      try {
        const parsedReason = JSON.parse(existingReason) as AIAnalysisResult;
        return {
          heuristicScore: existingScore,
          finalScore: existingScore,
          aiAnalysis: parsedReason,
          reasonSummary: parsedReason.summary || 'Cached evaluation score.',
          shouldNotify: existingScore >= 60,
        };
      } catch {
        // Not a JSON reason, continue normal evaluation
      }
    }

    // 2. Pre-filter with Heuristics
    const heuristic = this.calculateHeuristicScore(job);

    if (heuristic.isDisqualified || heuristic.score < 40) {
      logger.info(`Job [${job.title}] filtered out by heuristic (score: ${heuristic.score})`);
      return {
        heuristicScore: heuristic.score,
        finalScore: heuristic.score,
        reasonSummary: heuristic.reasons.join(', ') || 'Below matching threshold',
        shouldNotify: false,
      };
    }

    // 3. AI Semantic Evaluation with Gemini 2.5 Flash
    logger.info(`Job [${job.title}] passed heuristic (${heuristic.score}%). Running Gemini AI analysis...`);
    const aiAnalysis = await jobAnalyzer.analyzeJob(job);

    // Weighted blend: 30% heuristic + 70% AI semantic analysis
    const blendedScore = Math.round(heuristic.score * 0.3 + aiAnalysis.matchScore * 0.7);

    return {
      heuristicScore: heuristic.score,
      finalScore: blendedScore,
      aiAnalysis,
      reasonSummary: aiAnalysis.summary,
      shouldNotify: blendedScore >= 60,
    };
  }
}

export const jobScorer = new JobScorer();
