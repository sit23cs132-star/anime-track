// Uses Expo's Push Notification Service (https://exp.host/--/api/v2/push/send)
// Accepts ExponentPushToken[...] directly — no Firebase Admin SDK needed for sending.
// Firebase Admin SDK is still used for auth/backend, but push delivery goes via Expo.

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: 'default';
  priority?: 'high' | 'normal' | 'default';
  channelId?: string;
  badge?: number;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface ExpoSendResult {
  successCount: number;
  failureCount: number;
  errors: string[];
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Expo recommends batches of max 100 tokens per request
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function sendPushNotification(
  tokens: string[],
  payload: NotificationPayload
): Promise<ExpoSendResult> {
  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, errors: [] };
  }

  const result: ExpoSendResult = { successCount: 0, failureCount: 0, errors: [] };
  const batches = chunkArray(tokens, 100);

  for (const batch of batches) {
    const messages: ExpoPushMessage[] = batch.map((token) => ({
      to: token,
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      sound: 'default',
      priority: 'high',
      channelId: 'anime-releases',
      badge: 1,
    }));

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        const errText = await response.text();
        result.failureCount += batch.length;
        result.errors.push(`Expo API error ${response.status}: ${errText}`);
        continue;
      }

      const json = await response.json() as { data: ExpoPushTicket[] };
      const tickets: ExpoPushTicket[] = json.data;

      tickets.forEach((ticket, idx) => {
        if (ticket.status === 'ok') {
          result.successCount++;
          console.log(`[Push] ✅ Sent to ${batch[idx]} → ticket id: ${ticket.id}`);
        } else {
          result.failureCount++;
          const errMsg = ticket.message || ticket.details?.error || 'unknown error';
          result.errors.push(`Token ${batch[idx]}: ${errMsg}`);
          console.error(`[Push] ❌ Failed for ${batch[idx]}: ${errMsg}`);
        }
      });
    } catch (error) {
      result.failureCount += batch.length;
      result.errors.push(`Network error sending batch: ${error}`);
      console.error('[Push] Network error:', error);
    }
  }

  return result;
}