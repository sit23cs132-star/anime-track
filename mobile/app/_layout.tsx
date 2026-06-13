import { Stack } from 'expo-router';
import { Providers } from '../src/providers';
import { NotificationSetup } from '../src/components/NotificationSetup';

export default function RootLayout() {
  return (
    <Providers>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
      <NotificationSetup />
    </Providers>
  );
}