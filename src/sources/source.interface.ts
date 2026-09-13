import { RawJobListing } from '../jobs/types.js';

export interface JobSource {
  readonly name: string;
  readonly isEnabled: boolean;
  fetchJobs(): Promise<RawJobListing[]>;
}
