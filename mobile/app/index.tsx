import { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WatchlistDashboard } from '../src/components/WatchlistDashboard';
import { NotificationSetup } from '../src/components/NotificationSetup';
import { useApp } from '../src/providers';
import { registerForPushNotificationsAsync } from '../src/services/notificationHandler';
import { ScrollView } from 'react-native';

export default function HomeScreen() {
  const { supabase, isReady } = useApp();
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (isReady && !isRegistered) {
      registerForPushNotificationsAsync(supabase)
        .then((token) => {
          if (token) setIsRegistered(true);
        })
        .catch(() => {
          // Silently fail in Expo Go - push notifications not supported
        });
    }
  }, [isReady, supabase, isRegistered]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a12" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled={true}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Anime Tracker</Text>
          <Text style={styles.subtitle}>Real-time release notifications</Text>
          <View style={[
            styles.statusBadge, 
            isRegistered ? styles.statusActive : styles.statusInactive
          ]}>
            <Text style={styles.statusText}>
              {isRegistered ? '● Connected' : '○ Waiting for permission'}
            </Text>
          </View>
        </View>

        {/* Render watchlist items directly (not inside FlatList) to avoid nested virtualized list */}
        <WatchlistDashboard supabase={supabase} />

        <NotificationSetup />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a12',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#8888a0',
    marginTop: 4,
    fontWeight: '400',
  },
  statusBadge: {
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusActive: {
    backgroundColor: 'rgba(187, 134, 252, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.3)',
  },
  statusInactive: {
    backgroundColor: 'rgba(245, 0, 87, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 0, 87, 0.3)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'monospace',
    color: '#ffffff',
  },
});