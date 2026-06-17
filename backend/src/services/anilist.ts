/**
 * AniList GraphQL API Service
 *
 * Fetches anime airing schedules from AniList's public API.
 * No API key required. Queries a time window to find episodes
 * that have recently aired in the last N minutes.
 *
 * AniList stores ALL airing times as UTC Unix timestamps.
 * India (IST) = UTC+5:30, which is handled automatically.
 */

const ANILIST_API_URL = 'https://graphql.anilist.co';

export interface AiringEpisode {
  airingAt: number;      // Unix timestamp (UTC) of when the episode aired
  episode: number;       // The episode number
  titleEnglish: string;  // English title from AniList
  titleRomaji: string;   // Romaji (romanized Japanese) title from AniList
  titleNative: string;   // Native Japanese title from AniList
  mediaId: number;       // AniList media ID
}

const AIRING_SCHEDULE_QUERY = `
  query ($airingAt_greater: Int, $airingAt_lesser: Int, $page: Int) {
    Page(page: $page, perPage: 50) {
      pageInfo {
        hasNextPage
        currentPage
      }
      airingSchedules(
        airingAt_greater: $airingAt_greater,
        airingAt_lesser: $airingAt_lesser,
        sort: TIME_DESC
      ) {
        airingAt
        episode
        media {
          id
          title {
            english
            romaji
            native
          }
          countryOfOrigin
          status
        }
      }
    }
  }
`;

/**
 * Fetches anime episodes that aired within the given time window.
 *
 * @param windowMinutes - How many minutes back to check (default: 1440 mins / 24 hours,
 *                        so we never miss an episode even if the scheduler runs late)
 */
export async function fetchAiringSchedule(windowMinutes = 1440): Promise<AiringEpisode[]> {
  const nowUnix = Math.floor(Date.now() / 1000); // current time in UTC Unix seconds
  const windowStart = nowUnix - windowMinutes * 60;

  console.log(
    `[AniList] Checking for episodes aired between ` +
    `${new Date(windowStart * 1000).toISOString()} and ${new Date(nowUnix * 1000).toISOString()} (UTC)`
  );

  const results: AiringEpisode[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await fetch(ANILIST_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: AIRING_SCHEDULE_QUERY,
        variables: {
          airingAt_greater: windowStart,
          airingAt_lesser: nowUnix,
          page,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`AniList API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const json = await response.json() as any;

    if (json.errors) {
      throw new Error(`AniList GraphQL error: ${JSON.stringify(json.errors)}`);
    }

    const pageData = json?.data?.Page;
    if (!pageData) break;

    const schedules = pageData.airingSchedules ?? [];
    console.log(`[AniList] Page ${page}: Found ${schedules.length} airing schedule entries`);

    for (const schedule of schedules) {
      const media = schedule.media;

      // Only process Japanese anime (countryOfOrigin = JP)
      if (media?.countryOfOrigin !== 'JP') continue;
      // Only process currently airing shows
      if (media?.status !== 'RELEASING') continue;

      results.push({
        airingAt: schedule.airingAt,
        episode: schedule.episode,
        titleEnglish: media.title?.english ?? '',
        titleRomaji: media.title?.romaji ?? '',
        titleNative: media.title?.native ?? '',
        mediaId: media.id,
      });
    }

    hasNextPage = pageData.pageInfo?.hasNextPage ?? false;
    page++;

    // Safety: stop at page 5 to prevent infinite loop
    if (page > 5) break;
  }

  console.log(`[AniList] Total episodes found in window: ${results.length}`);
  return results;
}
