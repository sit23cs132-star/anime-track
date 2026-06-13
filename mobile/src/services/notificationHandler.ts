import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { registerDeviceToken } from './supabase';
import { useSupabase } from './supabase';

const isExpoGo = Constants.appOwnership === 'expo';

// Lazily load expo-notifications only if NOT running in Expo Go
let Notifications: any = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (error) {
    console.warn('Failed to load expo-notifications:', error);
  }
}

export async function registerForPushNotificationsAsync(
  supabase: ReturnType<typeof useSupabase>
): Promise<string | null> {
  if (isExpoGo || !Notifications) {
    console.log('Skipping push notification registration on Expo Go.');
    return null;
  }

  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('anime-releases', {
      name: 'Anime Releases',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#BB86FC',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permission not granted');
      return null;
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId 
        || Constants.expoConfig?.extra?.projectId;
      
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      token = tokenData.data;
      console.log('Expo Push Token:', token);
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  } else {
    console.warn('Must use physical device for Push Notifications');
    return null;
  }

  // Register token with Supabase backend
  if (token) {
    const platform = Platform.OS as 'ios' | 'android';
    const result = await registerDeviceToken(supabase, token, platform);
    
    if (result.success) {
      console.log('Device token registered with backend');
    } else {
      console.error('Failed to register token:', result.error);
    }
  }

  return token;
}

export function useNotificationListener(
  onNotification: (notification: any) => void
) {
  if (isExpoGo || !Notifications) {
    return () => {};
  }

  const listener = Notifications.addNotificationReceivedListener((notification: any) => {
    onNotification(notification);
  });

  const responseListener = Notifications.addNotificationResponseReceivedListener((response: any) => {
    console.log('Notification response:', response);
  });

  return () => {
    listener.remove();
    responseListener.remove();
  };
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>
) {
  if (isExpoGo || !Notifications) {
    console.log('Local notification (skipped on Expo Go):', title, - body);
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // Show immediately
  });
}