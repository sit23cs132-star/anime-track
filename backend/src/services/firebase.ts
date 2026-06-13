import * as admin from 'firebase-admin';

const projectId = process.env.FIREBASE_PROJECT_ID!;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export const messaging = admin.messaging();

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPushNotification(
  tokens: string[],
  payload: NotificationPayload
): Promise<admin.messaging.BatchResponse> {
  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, responses: [] };
  }

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data || {},
    android: {
      priority: 'high',
      notification: {
        channelId: 'anime-releases',
        icon: 'ic_notification',
        color: '#BB86FC',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
  };

  try {
    const response = await messaging.sendEachForMulticast(message);
    
    // Handle failed tokens (optional: cleanup invalid tokens)
    const failedTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const error = resp.error;
        console.error(`Failed to send to token ${tokens[idx]}:`, error?.message);
        if (error?.code === 'messaging/registration-token-not-registered' ||
            error?.code === 'messaging/invalid-registration-token') {
          failedTokens.push(tokens[idx]);
        }
      }
    });

    // Cleanup invalid tokens (optional - implement if needed)
    // await cleanupInvalidTokens(failedTokens);

    return response;
  } catch (error) {
    console.error('Error sending multicast notification:', error);
    throw error;
  }
}