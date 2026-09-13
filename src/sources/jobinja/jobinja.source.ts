import axios from 'axios';
import * as cheerio from 'cheerio';
import { JobSource } from '../source.interface.js';
import { RawJobListing } from '../../jobs/types.js';
import { logger } from '../../utils/logger.js';

export class JobinjaSource implements JobSource {
  readonly name = 'jobinja';
  readonly isEnabled = true;

  private readonly searchUrls = [
    'https://jobinja.ir/jobs?filters%5Bkeywords%5D%5B%5D=%D8%B7%D8%B1%D8%A7%D8%AD+%D9%85%D8%AD%D8%B5%D9%88%D9%84', // طراح محصول
    'https://jobinja.ir/jobs?filters%5Bkeywords%5D%5B%5D=ui%2Bux', // ui ux
    'https://jobinja.ir/jobs?filters%5Bkeywords%5D%5B%5D=%D8%B7%D8%B1%D8%A7%D8%AD+%D8%B1%D8%A7%D8%A8%D8%B7+%DA%A9%D8%A7%D8%B1%D8%A8%D8%B1%DB%8C', // طراح رابط کاربری
    'https://jobinja.ir/jobs?filters%5Bkeywords%5D%5B%5D=%D8%B7%D8%B1%D8%A7%D8%AD+%D8%AA%D8%AC%D8%B1%D8%A8%D9%87+%DA%A9%D8%A7%D8%B1%D8%A8%D8%B1%DB%8C', // طراح تجربه کاربری
    'https://jobinja.ir/jobs?filters%5Bkeywords%5D%5B%5D=Product+Designer',
  ];

  private readonly defaultHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'fa,en-US;q=0.9,en;q=0.8',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  };

  async fetchJobs(): Promise<RawJobListing[]> {
    const jobMap = new Map<string, RawJobListing>();

    for (const url of this.searchUrls) {
      try {
        logger.info(`Fetching Jobinja search URL: ${url}`);
        const response = await axios.get(url, {
          headers: this.defaultHeaders,
          timeout: 15000,
        });

        const $ = cheerio.load(response.data);
        const items = $('li.o-listView__item, .c-jobListView__item, .o-listView__itemInfo');

        items.each((_, el) => {
          const $el = $(el);
          const titleLink = $el.find('.c-jobListView__titleLink, a.c-jobListView__title, a.o-listView__itemTitle');
          const title = titleLink.text().trim();
          let href = titleLink.attr('href') || '';

          if (!title || !href) return;

          if (href.startsWith('/')) {
            href = `https://jobinja.ir${href}`;
          }

          const company = $el
            .find('.c-jobListView__metaItem:first-child, .c-jobListView__companyName, span.c-jobListView__metaText')
            .first()
            .text()
            .trim();

          const location = $el
            .find('.c-jobListView__metaItem:nth-child(2), .c-jobListView__location')
            .text()
            .trim();

          const postedAt = $el.find('.c-jobListView__passedTime, .o-listView__itemPassedTime').text().trim();

          // Extract job id from url
          const matchId = href.match(/\/jobs\/([a-zA-Z0-9]+)/);
          const sourceJobId = matchId ? matchId[1] : undefined;

          // Skills & description summary
          const snippet = $el.find('.c-jobListView__description, .o-box__text').text().trim();

          if (!jobMap.has(href)) {
            jobMap.set(href, {
              source: this.name,
              sourceJobId,
              title,
              company: company || 'شرکت محرمانه',
              location: location || 'ایران / تهران',
              description: snippet || `${title} در ${company}`,
              url: href,
              postedAt: postedAt || 'به تازگی',
            });
          }
        });
      } catch (error) {
        logger.error(`Error fetching Jobinja url: ${url}`, error);
      }
    }

    const initialJobs = Array.from(jobMap.values());
    logger.info(`Fetched ${initialJobs.length} raw jobs from Jobinja listings`);

    // Enhance top candidates with full detail page if needed (up to 15 items to be fast)
    const enrichedJobs: RawJobListing[] = [];
    for (const job of initialJobs.slice(0, 15)) {
      try {
        const enriched = await this.enrichJobDetail(job);
        enrichedJobs.push(enriched);
      } catch (err) {
        enrichedJobs.push(job);
      }
    }

    // append rest
    for (const job of initialJobs.slice(15)) {
      enrichedJobs.push(job);
    }

    return enrichedJobs;
  }

  private async enrichJobDetail(job: RawJobListing): Promise<RawJobListing> {
    try {
      const resp = await axios.get(job.url, {
        headers: this.defaultHeaders,
        timeout: 10000,
      });

      const $ = cheerio.load(resp.data);
      const fullDesc = $('.o-box__text, .c-infoBox__description, .c-jobView__description').text().trim();
      const skills: string[] = [];

      $('.c-infoBox__tags .c-infoBox__tag, .c-tagList__item, .c-infoBox__item').each((_, el) => {
        const tag = $(el).text().trim();
        if (tag) skills.push(tag);
      });

      const employmentType = $('.c-infoBox__item:contains("نوع همکاری")').text().replace('نوع همکاری:', '').trim();

      return {
        ...job,
        description: fullDesc || job.description,
        skills: skills.length > 0 ? skills : undefined,
        employmentType: employmentType || job.employmentType,
      };
    } catch {
      return job;
    }
  }
}
