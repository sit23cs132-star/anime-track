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

  console.log('[Cron] Starting feed check...');
  
  try {
    const items = await fetchAnimeFeed();
    console.log(`[Cron] Fetched ${items.length} items from RSS feed`);
    result.checked = items.length;

    const deviceTokens = await getActiveDeviceTokens();
    console.log(`[Cron] Found ${deviceTokens.length} registered device(s)`);

    if (deviceTokens.length === 0) {
      console.log('[Cron] No devices registered, skipping notification dispatch');
      return result;
    }

    for (const item of items) {
      const match = matchAgainstWatchlist(item.title);
      
      if (!match) {
        continue;
      }

      result.matched++;
      const { entry, episodeNumber } = match;
      const episodeKeyHash = generateEpisodeKeyHash(entry.canonicalName, episodeNumber);

      console.log(`[Cron] Match found: ${entry.canonicalName} - Episode ${episodeNumber}`);

      // Check if already notified
      const alreadyNotified = await hasEpisodeBeenNotified(episodeKeyHash);
      if (alreadyNotified) {
        console.log(`[Cron] Already notified for ${episodeKeyHash}, skipping`);
        continue;
      }

      // Send notification
      const payload = {
        title: `🎬 New Episode: ${entry.canonicalName}`,
        body: `Episode ${episodeNumber} has been released!`,
        data: {
          anime: entry.canonicalName,
          episode: episodeNumber.toString(),
          link: item.link,
          timestamp: new Date().toISOString(),
        },
      };

      try {
        const response = await sendPushNotification(deviceTokens, payload);
        console.log(`[Cron] Notification sent: ${response.successCount} success, ${response.failureCount} failed`);

        // Mark as notified
        await markEpisodeAsNotified(episodeKeyHash, entry.canonicalName);
        result.notified++;
      } catch (error) {
        const errorMsg = `Failed to send notification for ${episodeKeyHash}: ${error}`;
        console.error(`[Cron] ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    console.log(`[Cron] Completed. Checked: ${result.checked}, Matched: ${result.matched}, Notified: ${result.notified}`);
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
  // Optional: Verify cron secret
  const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
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