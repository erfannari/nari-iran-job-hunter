import { JobSource } from './source.interface.js';
import { JobinjaSource } from './jobinja/jobinja.source.js';
import { JobvisionSource } from './jobvision/jobvision.source.js';
import { RawJobListing } from '../jobs/types.js';
import { logger } from '../utils/logger.js';

export class JobSourceRegistry {
  private sources: JobSource[] = [];

  constructor() {
    this.registerSource(new JobinjaSource());
    this.registerSource(new JobvisionSource());
  }

  registerSource(source: JobSource): void {
    this.sources.push(source);
    logger.debug(`Registered job source: ${source.name}`);
  }

  getSources(): JobSource[] {
    return this.sources.filter((s) => s.isEnabled);
  }

  async fetchAllSources(): Promise<RawJobListing[]> {
    const activeSources = this.getSources();
    logger.info(`Starting scrape across ${activeSources.length} sources...`);

    const results = await Promise.allSettled(
      activeSources.map(async (source) => {
        try {
          logger.info(`Fetching jobs from [${source.name}]...`);
          const jobs = await source.fetchJobs();
          logger.info(`[${source.name}] returned ${jobs.length} jobs.`);
          return jobs;
        } catch (error) {
          logger.error(`Failed to fetch jobs from source [${source.name}]`, error);
          return [];
        }
      })
    );

    const allJobs: RawJobListing[] = [];
    for (const res of results) {
      if (res.status === 'fulfilled') {
        allJobs.push(...res.value);
      }
    }

    logger.info(`Aggregated total ${allJobs.length} raw jobs from all sources.`);
    return allJobs;
  }
}

export const sourceRegistry = new JobSourceRegistry();
