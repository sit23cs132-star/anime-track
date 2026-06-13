import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SupabaseClient } from '@supabase/supabase-js';

interface WatchlistItemProps {
  canonicalName: string;
  searchTerms: string[];
  status: 'tracking' | 'new-episode' | 'idle';
  lastEpisode?: number;
  lastNotified?: string;
}

const watchlistData = [
  {
    canonicalName: 'Classroom of the Elite 4th Season',
    searchTerms: ['Classroom of the Elite Season 4', 'Youkoso Jitsuryoku 4th', '2-nensei-hen'],
    status: 'tracking' as const,
    lastEpisode: 0,
    lastNotified: null,
  },
  {
    canonicalName: 'Re:ZERO Season 4',
    searchTerms: ['Re:Zero 4th Season', 'Re:Zero kara Hajimeru 4'],
    status: 'tracking' as const,
    lastEpisode: 0,
    lastNotified: null,
  },
  {
    canonicalName: 'Witch Hat Atelier',
    searchTerms: ['Tongari Boushi no Atelier'],
    status: 'tracking' as const,
    lastEpisode: 0,
    lastNotified: null,
  },
  {
    canonicalName: 'One Piece',
    searchTerms: ['One Piece'],
    status: 'tracking' as const,
    lastEpisode: 1100,
    lastNotified: '2024-01-15T10:30:00Z',
  },
];

interface WatchlistDashboardProps {
  supabase: SupabaseClient;
}

export function WatchlistDashboard({ supabase }: WatchlistDashboardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>WATCHLIST</Text>
      <View style={styles.listHeader} />
      {watchlistData.map((item, index) => (
        <View key={item.canonicalName}>
          <WatchlistItem item={item} supabase={supabase} />
          {index < watchlistData.length - 1 && <View style={styles.separator} />}
        </View>
      ))}
      <View style={styles.listFooter} />
    </View>
  );
}

function WatchlistItem({ item, supabase }: { item: WatchlistItemProps; supabase: SupabaseClient }) {
  const statusColors = {
    tracking: '#BB86FC',
    'new-episode': '#F50057',
    idle: '#666680',
  };

  const statusLabels = {
    tracking: 'TRACKING',
    'new-episode': 'NEW EPISODE',
    idle: 'IDLE',
  };

  return (
    <TouchableOpacity 
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => console.log('Open details for', item.canonicalName)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.animeInfo}>
          <Text style={styles.animeTitle}>{item.canonicalName}</Text>
          <View style={styles.metaRow}>
            <View style={[
              styles.statusDot, 
              { backgroundColor: statusColors[item.status] }
            ]} />
            <Text style={[
              styles.statusLabel, 
              { color: statusColors[item.status] }
            ]}>
              {statusLabels[item.status]}
            </Text>
            {item.lastEpisode > 0 && (
              <>
                <Text style={styles.divider}>|</Text>
                <Text style={styles.episodeInfo}>
                  Latest: Ep {item.lastEpisode}
                </Text>
              </>
            )}
          </View>
        </View>
        <View style={styles.arrowContainer}>
          <Text style={styles.arrow}>›</Text>
        </View>
      </View>

      <View style={styles.aliasesContainer}>
        <Text style={styles.aliasesLabel}>ALIASES</Text>
        <View style={styles.aliasesList}>
          {item.searchTerms.map((term, i) => (
            <Text key={i} style={styles.aliasTag}>
              {term}
            </Text>
          ))}
        </View>
      </View>

      {item.lastNotified && (
        <View style={styles.lastNotified}>
          <Text style={styles.lastNotifiedLabel}>LAST NOTIFIED</Text>
          <Text style={styles.lastNotifiedTime}>
            {formatRelativeTime(item.lastNotified)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666680',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  separator: {
    height: 12,
  },
  listHeader: {
    height: 8,
  },
  listFooter: {
    height: 24,
  },
  card: {
    backgroundColor: '#11111a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1a1a2e',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  animeInfo: {
    flex: 1,
  },
  animeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  metaRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    fontFamily: 'monospace',
  },
  divider: {
    color: '#333344',
  },
  episodeInfo: {
    fontSize: 12,
    color: '#8888a0',
    fontFamily: 'monospace',
  },
  arrowContainer: {
    padding: 4,
  },
  arrow: {
    fontSize: 24,
    color: '#333344',
    fontWeight: '300',
  },
  aliasesContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
  },
  aliasesLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#555570',
    letterSpacing: 1,
    marginBottom: 8,
  },
  aliasesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  aliasTag: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#22223b',
  },
  lastNotified: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastNotifiedLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#555570',
    letterSpacing: 1,
  },
  lastNotifiedTime: {
    fontSize: 12,
    color: '#BB86FC',
    fontFamily: 'monospace',
    fontWeight: '500',
  },
});