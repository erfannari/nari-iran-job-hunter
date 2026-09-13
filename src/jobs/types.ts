export type JobSourceType = 'jobinja' | 'jobvision' | string;

export interface RawJobListing {
  source: JobSourceType;
  sourceJobId?: string;
  title: string;
  company: string;
  location?: string;
  description: string;
  url: string;
  postedAt?: string;
  employmentType?: string;
  workplaceType?: string;
  requiredExperienceYears?: number;
  skills?: string[];
  rawSalary?: string;
}

export interface JobRecord {
  id: string;
  source: string;
  source_job_id?: string | null;
  title: string;
  normalized_title: string;
  company: string;
  normalized_company: string;
  location?: string | null;
  description: string;
  url: string;
  posted_at?: string | null;
  discovered_at: string;
  updated_at: string;
  employment_type?: string | null;
  workplace_type?: string | null;
  required_experience_years?: number | null;
  skills?: string | null; // JSON string array
  profile?: string | null;
  match_score?: number | null;
  match_reason?: string | null; // JSON string of AIAnalysisResult or structured summary
  status: 'new' | 'viewed' | 'saved' | 'applied' | 'ignored';
  fingerprint: string;
}

export interface AIAnalysisResult {
  matchScore: number;
  recommendation: 'STRONGLY APPLY' | 'APPLY' | 'CONSIDER' | 'SKIP';
  fitLevel: {
    designSkills: 'Exceptional Match' | 'Good Match' | 'Moderate Match' | 'Weak Match';
    experience: 'Ideal Level' | 'Acceptable Level' | 'Overqualified' | 'Underqualified';
  };
  reasons: string[];
  concerns?: string[];
  summary: string;
}

export interface JobScoringResult {
  heuristicScore: number;
  finalScore: number;
  aiAnalysis?: AIAnalysisResult;
  reasonSummary: string;
  shouldNotify: boolean;
}

export interface UserStateRecord {
  chat_id: string;
  username?: string | null;
  first_name?: string | null;
  is_active: number;
  min_score: number;
  portfolio_url?: string | null;
  cv_url?: string | null;
  created_at: string;
  last_active_at: string;
}
