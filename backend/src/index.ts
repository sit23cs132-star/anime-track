import 'dotenv/config';
import { fetchAnimeFeed } from './services/rss';
import { matchAgainstWatchlist, generateEpisodeKeyHash } from './utils/filter';
import {
  getActiveDeviceTokens,
  hasEpisodeBeenNotified,
  markEpisodeAsNotified
} from './services/supabase';
import { sendPushNotification } from './services/firebase';

interface CronResult {
  checked: number;
  matched: number;
  notified: number;
  errors: string[];
}

async function processFeed(): Promise<CronResult> {
  const result: CronResult = {
    checked: 0,
    matched: 0,
    notified: 0,
    errors: [],
  };

  console.log('[Cron] Starting SubsPlease RSS airing schedule check...');

  try {
    const rssItems = await fetchAnimeFeed();
    result.checked = rssItems.length;

    console.log(`[Cron] Found ${rssItems.length} item(s) in the RSS feed`);

    if (rssItems.length === 0) {
      console.log('[Cron] No items found in RSS feed. Exiting.');
      return result;
    }

    const deviceTokens = await getActiveDeviceTokens();
    console.log(`[Cron] Found ${deviceTokens.length} registered device(s)`);

    if (deviceTokens.length === 0) {
      console.log('[Cron] No devices registered, skipping notification dispatch');
      return result;
    }

    for (const item of rssItems) {
      const match = matchAgainstWatchlist(item.title);

      if (!match) {
        console.log(`[Cron] No watchlist match for RSS item: "${item.title}"`);
        continue;
      }

      result.matched++;
      const { entry, episodeNumber } = match;
      const episodeKeyHash = generateEpisodeKeyHash(entry.canonicalName, episodeNumber);

      // Parse release publication date for logging (defaulting to current time if missing)
      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
      const releasedAtIST = pubDate.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      console.log(
        `[Cron] Match: "${entry.canonicalName}" - Ep ${episodeNumber} ` +
        `(published at ${releasedAtIST} IST)`
      );

      // Check if already notified
      const alreadyNotified = await hasEpisodeBeenNotified(episodeKeyHash);
      if (alreadyNotified) {
        console.log(`[Cron] Already notified for ${episodeKeyHash}, skipping`);
        continue;
      }

      // Build notification payload
      const payload = {
        title: `🎬 ${entry.canonicalName}`,
        body: `Episode ${episodeNumber} is now streaming! Watch it now.`,
        data: {
          anime: entry.canonicalName,
          episode: episodeNumber.toString(),
          airedAt: pubDate.toISOString(),
          source: 'subsplease',
        },
      };

      try {
        const response = await sendPushNotification(deviceTokens, payload);
        console.log(
          `[Cron] Notification sent: ${response.successCount} success, ${response.failureCount} failed`
        );
        if (response.errors.length > 0) {
          console.warn(`[Cron] Push errors:`, response.errors);
        }

        // Mark as notified in database
        await markEpisodeAsNotified(episodeKeyHash, entry.canonicalName, episodeNumber);
        result.notified++;
      } catch (error) {
        const errorMsg = `Failed to send notification for ${episodeKeyHash}: ${error}`;
        console.error(`[Cron] ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    console.log(
      `[Cron] Completed. Checked: ${result.checked}, Matched: ${result.matched}, Notified: ${result.notified}`
    );
    return result;
  } catch (error) {
    const errorMsg = `Cron job failed: ${error}`;
    console.error(`[Cron] ${errorMsg}`);
    result.errors.push(errorMsg);
    return result;
  }
}

// Vercel/Netlify/Serverless handler
export default async function handler(req: any, res: any) {
  // Verify cron secret (handles standard Vercel Cron header, custom header, or query param)
  const authHeader = req.headers['authorization'];
  const cronSecret =
    req.headers['x-cron-secret'] ||
    req.query.secret ||
    (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined);

  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && cronSecret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const result = await processFeed();

  return res.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    ...result,
  });
}

// Allow running directly with `ts-node src/index.ts` for local testing
if (require.main === module) {
  processFeed()
    .then((result) => {
      console.log('Local run complete:', result);
      process.exit(result.errors.length > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Local run failed:', error);
      process.exit(1);
    });
}