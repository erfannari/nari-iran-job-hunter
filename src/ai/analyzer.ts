import { GoogleGenAI } from '@google/genai';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { JobRecord, AIAnalysisResult } from '../jobs/types.js';
import { aiAnalysisSchema } from './schemas.js';

export class JobAnalyzer {
  private ai: GoogleGenAI | null = null;
  private candidateModels = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];

  constructor() {
    if (config.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
    }
  }

  async analyzeJob(job: JobRecord): Promise<AIAnalysisResult> {
    if (!this.ai || config.AI_PROVIDER === 'mock') {
      return this.generateMockAnalysis(job);
    }

    const prompt = `
You are an expert tech recruiter and senior design hiring consultant specialized in the Iranian tech ecosystem.
Evaluate the following job posting against our Target Design Candidate Profile:

### Target Candidate Profile:
- Primary Roles: UI/UX Designer (3-4 years exp) or Product Designer (1-2 years exp), UX Researcher, Visual / Interaction Designer.
- Core Skills: Figma, Design Systems, Wireframing, User Research, Usability Testing, Prototyping, Information Architecture.
- Negative Fit (Immediate low score): Pure Frontend Developer / Coding role, Graphic Print / Banner production / Offset print house, 3D Artist, Interior / Industrial Design, Sales / Admin.
- Note: Both Persian and English job descriptions are completely valid and should be evaluated equally.

### Job Posting to Evaluate:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location || 'Not specified'}
- Employment Type: ${job.employment_type || 'Full Time'}
- Skills Listed: ${job.skills || 'N/A'}
- Description:
${job.description.slice(0, 3000)}

### Response Instructions:
Return a valid JSON object strictly matching this schema:
{
  "matchScore": <number between 0 and 100>,
  "recommendation": <"STRONGLY APPLY" | "APPLY" | "CONSIDER" | "SKIP">,
  "fitLevel": {
    "designSkills": <"Exceptional Match" | "Good Match" | "Moderate Match" | "Weak Match">,
    "experience": <"Ideal Level" | "Acceptable Level" | "Overqualified" | "Underqualified">
  },
  "reasons": [<2-4 short bullet points explaining why it fits or matches the candidate profile>],
  "concerns": [<0-2 short bullet points on any caveats or missing info>],
  "summary": "<1-2 sentence concise executive evaluation summary in English>"
}
`;

    for (const model of this.candidateModels) {
      try {
        const response = await this.ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        const responseText = response.text || '{}';
        const parsedJson = JSON.parse(responseText);
        const validated = aiAnalysisSchema.parse(parsedJson);

        return validated;
      } catch (error) {
        logger.warn(`Model ${model} attempt failed, trying fallback...`, { error: (error as Error).message });
      }
    }

    logger.error(`All Gemini models failed for job: ${job.title}`);
    return this.generateFallbackAnalysis(job);
  }

  private generateMockAnalysis(job: JobRecord): AIAnalysisResult {
    return {
      matchScore: 85,
      recommendation: 'STRONGLY APPLY',
      fitLevel: {
        designSkills: 'Exceptional Match',
        experience: 'Ideal Level',
      },
      reasons: [
        `Target Design role: "${job.title}"`,
        'Core design skill match: Figma & Design Systems',
        'Strong alignment with candidate design experience level',
      ],
      concerns: [],
      summary: `High quality design position at ${job.company} with great alignment for UI/UX & Product Design.`,
    };
  }

  private generateFallbackAnalysis(job: JobRecord): AIAnalysisResult {
    const score = job.match_score || 70;
    return {
      matchScore: score,
      recommendation: score >= 80 ? 'STRONGLY APPLY' : score >= 60 ? 'APPLY' : 'CONSIDER',
      fitLevel: {
        designSkills: score >= 75 ? 'Good Match' : 'Moderate Match',
        experience: 'Acceptable Level',
      },
      reasons: [
        `Matched design keywords in title: ${job.title}`,
        `Company: ${job.company}`,
      ],
      concerns: ['AI detailed analysis unavailable at scan time; score derived from heuristics.'],
      summary: `Position at ${job.company} matches key design profile criteria.`,
    };
  }
}

export const jobAnalyzer = new JobAnalyzer();
