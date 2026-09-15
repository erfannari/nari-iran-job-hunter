import axios from 'axios';
import { JobSource } from '../source.interface.js';
import { RawJobListing } from '../../jobs/types.js';
import { logger } from '../../utils/logger.js';

export class JobvisionSource implements JobSource {
  readonly name = 'jobvision';
  readonly isEnabled = true;

  private readonly defaultHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'fa,en-US;q=0.9,en;q=0.8',
    'Content-Type': 'application/json',
    Accept: 'application/json, text/plain, */*',
  };

  async fetchJobs(): Promise<RawJobListing[]> {
    const jobMap = new Map<string, RawJobListing>();
    const keywords = ['UI/UX', 'طراح محصول', 'Product Designer', 'طراح رابط کاربری', 'طراح تجربه کاربری'];

    for (const keyword of keywords) {
      try {
        const response = await axios.post(
          'https://candidateapi.jobvision.ir/api/v1/JobPost/List',
          {
            keyword,
            page: 1,
            pageSize: 25,
            locIds: [1], // Tehran location ID in Jobvision
          },
          {
            headers: this.defaultHeaders,
            timeout: 10000,
          }
        );

        const posts = response.data?.data?.jobPosts || [];
        for (const item of posts) {
          const id = item.id;
          const title = item.title || '';
          const company = item.company?.nameFa || item.company?.nameEn || 'شرکت محرمانه';
          const location = item.location?.city?.titleFa || item.location?.province?.titleFa || 'تهران';
          const url = `https://jobvision.ir/jobs/${id}`;
          const postedAt = item.activationTime?.beautifyFa || item.firstActivationTime?.beautifyFa || 'به تازگی';

          const workplaceType = item.properties?.isRemote ? 'Remote' : 'On-site';

          // Location filtering check
          const locLower = location.toLowerCase();
          const isRemote = workplaceType === 'Remote' || locLower.includes('دورکاری') || locLower.includes('remote');
          const isTehran = locLower.includes('تهران') || locLower.includes('tehran');
          if (location && !isTehran && !isRemote) {
            const otherCities = ['اصفهان', 'مشهد', 'شیراز', 'تبریز', 'کرج', 'یزد', 'قم', 'رشت', 'اهواز', 'کرمان', 'ساری', 'همدان'];
            if (otherCities.some((c) => locLower.includes(c))) {
              continue;
            }
          }

          const skills: string[] = [];
          if (Array.isArray(item.jobCategories)) {
            for (const cat of item.jobCategories) {
              if (cat?.titleFa) skills.push(cat.titleFa);
              if (cat?.titleEn) skills.push(cat.titleEn);
            }
          }

          const employmentType = item.workType?.titleFa || item.seniorityLevel?.titleFa;
          const expYears = item.properties?.requiredRelatedExperienceYears;

          if (id && title && !jobMap.has(url)) {
            jobMap.set(url, {
              source: this.name,
              sourceJobId: String(id),
              title,
              company,
              location: location || 'تهران',
              description: `${title} در شرکت ${company}. دسته شغلی: ${skills.join(', ')}. سابقه کار مورد نیاز: ${expYears ? `${expYears} سال` : 'نامشخص'}.`,
              url,
              postedAt,
              skills: skills.length > 0 ? skills : undefined,
              employmentType,
              workplaceType,
              requiredExperienceYears: typeof expYears === 'number' ? expYears : undefined,
            });
          }
        }
      } catch (err) {
        logger.error(`Jobvision API search error for "${keyword}"`, err);
      }
    }

    logger.info(`Fetched ${jobMap.size} raw jobs from Jobvision`);
    return Array.from(jobMap.values());
  }
}
