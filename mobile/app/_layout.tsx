import { Stack } from 'expo-router';
import { Providers } from '../src/providers';

export default function RootLayout() {
  return (
    <Providers>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </Providers>
  );
}