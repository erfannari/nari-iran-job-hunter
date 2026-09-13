import { z } from 'zod';

export const aiAnalysisSchema = z.object({
  matchScore: z.number().min(0).max(100),
  recommendation: z.enum(['STRONGLY APPLY', 'APPLY', 'CONSIDER', 'SKIP']),
  fitLevel: z.object({
    designSkills: z.enum(['Exceptional Match', 'Good Match', 'Moderate Match', 'Weak Match']),
    experience: z.enum(['Ideal Level', 'Acceptable Level', 'Overqualified', 'Underqualified']),
  }),
  reasons: z.array(z.string()),
  concerns: z.array(z.string()).optional().default([]),
  summary: z.string(),
});

export type AIAnalysisResponse = z.infer<typeof aiAnalysisSchema>;
