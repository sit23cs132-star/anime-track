import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { SupabaseClient } from '@supabase/supabase-js';

interface WatchlistItemProps {
  id: string;
  canonical_name: string;
  search_terms: string[];
  image_url?: string;
  animepahe_slug?: string;
  anilist_id?: number;
  genres: string[];
  next_airing_episode?: number;
  airing_at?: string;
  lastEpisode?: number;
  lastNotified?: string | null;
}

interface WatchedEpisode {
  watchlist_id: string;
  episode_number: number;
}

interface WatchlistDashboardProps {
  supabase: SupabaseClient;
}

export function WatchlistDashboard({ supabase }: WatchlistDashboardProps) {
  const [watchlist, setWatchlist] = useState<WatchlistItemProps[]>([]);
  const [watchedEpisodes, setWatchedEpisodes] = useState<WatchedEpisode[]>([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  
  // Airing countdown state
  const [airingInfo, setAiringInfo] = useState<Record<number, { airingAt: number; episode: number }>>({});
  const [nowTime, setNowTime] = useState(Math.floor(Date.now() / 1000));
  
  // Slug edit modal state
  const [editingItem, setEditingItem] = useState<WatchlistItemProps | null>(null);
  const [newSlugText, setNewSlugText] = useState('');
  
  // Search debouncing ref
  const searchTimeoutRef = useRef<any>(null);

  // Episode progress editing state
  const [editingProgress, setEditingProgress] = useState<Record<string, string>>({});

  // Fetch watchlist data
  const fetchWatchlistData = async () => {
    try {
      const { data: watchlistData, error: wlError } = await supabase
        .from('watchlist')
        .select('*')
        .order('canonical_name', { ascending: true });

      if (wlError) throw wlError;

      const { data: watchedData, error: wedError } = await supabase
        .from('watched_episodes')
        .select('watchlist_id, episode_number');

      if (wedError) throw wedError;

      const { data: notifiedData, error: nError } = await supabase
        .from('episodes_notified')
        .select('title, episode_number, notified_at')
        .order('notified_at', { ascending: false });

      if (nError) throw nError;

      // Combine tables
      const mappedWatchlist = (watchlistData || []).map((item: any) => {
        const match = (notifiedData || []).find(
          row => row.title?.toLowerCase() === item.canonical_name.toLowerCase()
        );

        return {
          id: item.id,
          canonical_name: item.canonical_name,
          search_terms: item.search_terms || [],
          image_url: item.image_url,
          animepahe_slug: item.animepahe_slug,
          anilist_id: item.anilist_id,
          genres: item.genres || [],
          next_airing_episode: item.next_airing_episode,
          airing_at: item.airing_at,
          lastEpisode: match ? match.episode_number : 0,
          lastNotified: match ? match.notified_at : null,
        };
      });

      setWatchlist(mappedWatchlist);
      setWatchedEpisodes(watchedData || []);

      // Pull latest airing schedule info from AniList for countdowns
      const ids = mappedWatchlist.map(w => w.anilist_id).filter(Boolean) as number[];
      if (ids.length > 0) {
        fetchAniListAiringInfo(ids);
      }
    } catch (err) {
      console.error('Failed to load watchlist data:', err);
    }
  };

  const fetchAniListAiringInfo = async (ids: number[]) => {
    try {
      const query = `
        query ($ids: [Int]) {
          Page(page: 1, perPage: 50) {
            media(id_in: $ids) {
              id
              nextAiringEpisode {
                airingAt
                episode
              }
            }
          }
        }
      `;

      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { ids } })
      });

      if (!response.ok) return;
      const json = (await response.json()) as any;
      const mediaList = json?.data?.Page?.media || [];
      
      const infoMap: Record<number, { airingAt: number; episode: number }> = {};
      mediaList.forEach((m: any) => {
        if (m.nextAiringEpisode) {
          infoMap[m.id] = {
            airingAt: m.nextAiringEpisode.airingAt,
            episode: m.nextAiringEpisode.episode
          };
        }
      });

      setAiringInfo(prev => ({ ...prev, ...infoMap }));
    } catch (err) {
      console.error('Error fetching AniList countdowns:', err);
    }
  };

  useEffect(() => {
    fetchWatchlistData();
    
    // Countdown updater interval
    const interval = setInterval(() => {
      setNowTime(Math.floor(Date.now() / 1000));
    }, 10000);

    return () => clearInterval(interval);
  }, [supabase]);

  // Handle Search input with 300ms debouncing (instant feeling)
  const handleSearch = (text: string) => {
    setSearchQuery(text);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Clear stale search results immediately to prevent flashing old data
    setSearchResults([]);

    if (text.trim().length < 3) {
      setSearching(false);
      return;
    }

    setSearching(true);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const query = `
          query ($search: String) {
            Page(page: 1, perPage: 6) {
              media(search: $search, type: ANIME) {
                id
                title {
                  english
                  romaji
                  native
                }
                coverImage {
                  large
                }
                genres
                nextAiringEpisode {
                  airingAt
                  episode
                }
              }
            }
          }
        `;

        const response = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, variables: { search: text } })
        });

        if (response.ok) {
          const json = (await response.json()) as any;
          setSearchResults(json?.data?.Page?.media || []);
        }
      } catch (err) {
        console.error('AniList search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  // Helper to generate a URL-friendly slug
  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Add anime to watchlist
  const handleAddAnime = async (media: any) => {
    const canonicalName = media.title.english || media.title.romaji || media.title.native;
    const slug = generateSlug(media.title.romaji || media.title.english || media.title.native);
    
    // Construct robust aliases array for RSS feed matchers
    const terms = new Set<string>();
    if (media.title.english) {
      terms.add(media.title.english.toLowerCase());
      terms.add(media.title.english.toLowerCase().replace(/[^\w\s]/g, ''));
    }
    if (media.title.romaji) {
      terms.add(media.title.romaji.toLowerCase());
      terms.add(media.title.romaji.toLowerCase().replace(/[^\w\s]/g, ''));
    }
    if (media.title.native) {
      terms.add(media.title.native.toLowerCase());
    }
    const base = (media.title.english || media.title.romaji || '').split(':')[0].split('-')[0].trim().toLowerCase();
    if (base) {
      terms.add(base);
    }
    const searchTerms = Array.from(terms).filter(Boolean);

    const imageUrl = media.coverImage?.large || '';
    const genres = media.genres || [];
    const anilistId = media.id;
    const nextEp = media.nextAiringEpisode?.episode || null;
    const airingAt = media.nextAiringEpisode?.airingAt 
      ? new Date(media.nextAiringEpisode.airingAt * 1000).toISOString()
      : null;

    try {
      const { error } = await supabase
        .from('watchlist')
        .insert({
          canonical_name: canonicalName,
          search_terms: searchTerms,
          animepahe_slug: slug,
          image_url: imageUrl,
          anilist_id: anilistId,
          genres: genres,
          next_airing_episode: nextEp,
          airing_at: airingAt
        });

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Info', 'This anime is already in your watchlist!');
        } else {
          throw error;
        }
      } else {
        setSearchQuery('');
        setSearchResults([]);
        fetchWatchlistData();
      }
    } catch (err) {
      console.error('Error adding show:', err);
      Alert.alert('Error', 'Failed to add show to watchlist.');
    }
  };

  // Remove anime from watchlist
  const handleRemoveAnime = (id: string, name: string) => {
    Alert.alert(
      'Remove Show',
      `Are you sure you want to stop tracking "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('watchlist')
                .delete()
                .eq('id', id);

              if (error) throw error;
              fetchWatchlistData();
            } catch (err) {
              console.error('Failed to remove show:', err);
            }
          }
        }
      ]
    );
  };

  // Episode tracking progress getters/setters
  const getWatchedProgress = (itemId: string): number => {
    const eps = watchedEpisodes
      .filter(we => we.watchlist_id === itemId)
      .map(we => we.episode_number);
    return eps.length > 0 ? Math.max(...eps) : 0;
  };

  const handleIncrementProgress = async (itemId: string, current: number) => {
    const nextEp = current + 1;
    
    // Optimistic Update
    const tempEpisode = { watchlist_id: itemId, episode_number: nextEp };
    setWatchedEpisodes(prev => [...prev, tempEpisode]);

    try {
      const { error } = await supabase
        .from('watched_episodes')
        .insert(tempEpisode);

      if (error) {
        // Rollback
        setWatchedEpisodes(prev => prev.filter(we => !(we.watchlist_id === itemId && we.episode_number === nextEp)));
        if (error.code !== '23505') throw error;
      }
      fetchWatchlistData();
    } catch (err) {
      console.error('Failed to increment progress:', err);
    }
  };

  const handleDecrementProgress = async (itemId: string, current: number) => {
    if (current === 0) return;

    // Optimistic Update
    setWatchedEpisodes(prev => prev.filter(we => !(we.watchlist_id === itemId && we.episode_number === current)));

    try {
      const { error } = await supabase
        .from('watched_episodes')
        .delete()
        .eq('watchlist_id', itemId)
        .eq('episode_number', current);

      if (error) {
        // Rollback
        const tempEpisode = { watchlist_id: itemId, episode_number: current };
        setWatchedEpisodes(prev => [...prev, tempEpisode]);
        throw error;
      }
      fetchWatchlistData();
    } catch (err) {
      console.error('Failed to decrement progress:', err);
    }
  };

  const handleSetProgress = async (itemId: string, newProgress: number, currentProgress: number) => {
    if (isNaN(newProgress) || newProgress < 0 || newProgress > 5000) return;
    if (newProgress === currentProgress) return;

    // Backup current state for rollback
    const backupWatched = [...watchedEpisodes];

    // Optimistic Update
    if (newProgress > currentProgress) {
      const newEps: WatchedEpisode[] = [];
      const existingEps = watchedEpisodes
        .filter(we => we.watchlist_id === itemId)
        .map(we => we.episode_number);

      for (let ep = 1; ep <= newProgress; ep++) {
        if (!existingEps.includes(ep)) {
          newEps.push({ watchlist_id: itemId, episode_number: ep });
        }
      }
      setWatchedEpisodes(prev => [...prev, ...newEps]);
    } else {
      setWatchedEpisodes(prev => prev.filter(we => !(we.watchlist_id === itemId && we.episode_number > newProgress)));
    }

    try {
      if (newProgress > currentProgress) {
        const existingEps = backupWatched
          .filter(we => we.watchlist_id === itemId)
          .map(we => we.episode_number);

        // Filter out items already recorded to prevent primary key violation errors
        const inserts = [];
        for (let ep = 1; ep <= newProgress; ep++) {
          if (!existingEps.includes(ep)) {
            inserts.push({
              watchlist_id: itemId,
              episode_number: ep
            });
          }
        }
        
        if (inserts.length > 0) {
          const { error } = await supabase
            .from('watched_episodes')
            .insert(inserts);

          if (error) {
            setWatchedEpisodes(backupWatched);
            if (error.code !== '23505') throw error;
          }
        }
      } else {
        const { error } = await supabase
          .from('watched_episodes')
          .delete()
          .eq('watchlist_id', itemId)
          .gt('episode_number', newProgress);

        if (error) {
          setWatchedEpisodes(backupWatched);
          throw error;
        }
      }
      
      fetchWatchlistData();
    } catch (err) {
      console.error('Failed to set progress:', err);
    }
  };

  // Edit slug triggers
  const handleStartEditSlug = (item: WatchlistItemProps) => {
    setEditingItem(item);
    setNewSlugText(item.animepahe_slug || '');
  };

  const handleSaveSlug = async () => {
    if (!editingItem) return;
    try {
      const { error } = await supabase
        .from('watchlist')
        .update({ animepahe_slug: newSlugText })
        .eq('id', editingItem.id);

      if (error) throw error;
      setEditingItem(null);
      fetchWatchlistData();
    } catch (err) {
      console.error('Failed to update slug:', err);
      Alert.alert('Error', 'Failed to update slug.');
    }
  };

  // Open streaming link on animepahe
  const handleOpenStream = (item: WatchlistItemProps) => {
    const url = item.animepahe_slug 
      ? `https://animepahe.pw/anime/${item.animepahe_slug}`
      : `https://animepahe.pw/play?q=${encodeURIComponent(item.canonical_name)}`;
    
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open streaming website.');
    });
  };

  // Analytics Math
  const totalTracked = watchlist.length;
  const totalWatched = watchedEpisodes.length;
  const watchTimeMins = totalWatched * 24;
  
  const formatWatchTime = (totalMins: number) => {
    const days = Math.floor(totalMins / 1440);
    const hours = Math.floor((totalMins % 1440) / 60);
    const mins = totalMins % 60;
    
    let parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    parts.push(`${mins}m`);
    return parts.join(' ');
  };

  // Favorite genres frequency
  const genreCountMap: Record<string, number> = {};
  let totalGenrePoints = 0;
  watchedEpisodes.forEach(we => {
    const show = watchlist.find(w => w.id === we.watchlist_id);
    if (show && show.genres) {
      show.genres.forEach(g => {
        genreCountMap[g] = (genreCountMap[g] || 0) + 1;
        totalGenrePoints++;
      });
    }
  });

  const topGenres = Object.entries(genreCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([genre, count]) => ({
      genre,
      percent: totalGenrePoints > 0 ? Math.round((count / totalGenrePoints) * 100) : 0
    }));

  return (
    <View style={styles.container}>
      {/* 1. Analytics Card */}
      <View style={styles.analyticsCard}>
        <Text style={styles.analyticsTitle}>📊 ANALYTICS DASHBOARD</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{totalTracked}</Text>
            <Text style={styles.statLabel}>TRACKED</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{totalWatched}</Text>
            <Text style={styles.statLabel}>EPISODES</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{formatWatchTime(watchTimeMins)}</Text>
            <Text style={styles.statLabel}>WATCH TIME</Text>
          </View>
        </View>
        
        {topGenres.length > 0 && (
          <View style={styles.genresSection}>
            <Text style={styles.genresSubTitle}>FAVORITE GENRES</Text>
            {topGenres.map((g, i) => (
              <View key={i} style={styles.genreBarRow}>
                <View style={styles.genreBarInfo}>
                  <Text style={styles.genreName}>{g.genre}</Text>
                  <Text style={styles.genrePercent}>{g.percent}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${g.percent}%` }]} />
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 2. AniList Search Section */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search anime on AniList to track..."
          placeholderTextColor="#666680"
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searching && <ActivityIndicator style={styles.searchLoader} color="#BB86FC" />}
      </View>

      {/* Search results popup list */}
      {searchQuery.trim().length >= 3 && (
        <View style={styles.searchResultsContainer}>
          {searchResults.length === 0 && !searching ? (
            <Text style={styles.noResultsText}>No results found on AniList.</Text>
          ) : (
            <ScrollView style={styles.searchResultsScroll} keyboardShouldPersistTaps="handled">
              {searchResults.map((media) => (
                <View key={media.id} style={styles.searchResultItem}>
                  <Image 
                    source={{ uri: media.coverImage?.large }} 
                    style={styles.searchResultImage} 
                  />
                  <View style={styles.searchResultInfo}>
                    <Text style={styles.searchResultTitle} numberOfLines={2}>
                      {media.title.english || media.title.romaji}
                    </Text>
                    <Text style={styles.searchResultGenres} numberOfLines={1}>
                      {media.genres?.join(', ')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.trackButton}
                    onPress={() => handleAddAnime(media)}
                  >
                    <Text style={styles.trackButtonText}>+ Track</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* 3. Watchlist Grid/List */}
      <Text style={styles.sectionTitle}>YOUR WATCHLIST</Text>
      
      {watchlist.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Your watchlist is empty.</Text>
          <Text style={styles.emptySubText}>Use the search bar above to start tracking shows!</Text>
        </View>
      ) : (
        watchlist.map((item, index) => {
          // Calculate countdown
          const airing = airingInfo[item.anilist_id || 0] || (item.airing_at ? { 
            airingAt: Math.floor(new Date(item.airing_at).getTime() / 1000), 
            episode: item.next_airing_episode || 0 
          } : null);
          
          let countdownText = '';
          if (airing && airing.airingAt > nowTime) {
            const diff = airing.airingAt - nowTime;
            const days = Math.floor(diff / 86400);
            const hours = Math.floor((diff % 86400) / 3600);
            const mins = Math.floor((diff % 3600) / 60);

            if (days > 0) {
              countdownText = `Airs in ${days}d ${hours}h`;
            } else {
              countdownText = `Airs in ${hours}h ${mins}m`;
            }
          }

          const progress = getWatchedProgress(item.id);

          return (
            <View key={item.id} style={styles.cardContainer}>
              <View style={styles.card}>
                <Image source={{ uri: item.image_url }} style={styles.cardImage} />
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.animeTitle} numberOfLines={2}>
                      {item.canonical_name}
                    </Text>
                    <TouchableOpacity 
                      style={styles.untrackSubButton} 
                      onPress={() => handleRemoveAnime(item.id, item.canonical_name)}
                    >
                      <Text style={styles.untrackText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.badgesRow}>
                    {countdownText !== '' ? (
                      <View style={styles.countdownBadge}>
                        <Text style={styles.countdownText}>⏰ {countdownText} (Ep {airing?.episode})</Text>
                      </View>
                    ) : item.lastEpisode && item.lastEpisode > 0 ? (
                      <View style={styles.latestEpisodeBadge}>
                        <Text style={styles.latestEpisodeText}>Ep {item.lastEpisode} Out</Text>
                      </View>
                    ) : (
                      <View style={styles.trackingBadge}>
                        <Text style={styles.trackingBadgeText}>TRACKING</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.genresRow}>
                    <Text style={styles.genresListText} numberOfLines={1}>
                      {item.genres?.slice(0, 3).join(' • ')}
                    </Text>
                  </View>

                  {/* Progress tracker */}
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>Progress:</Text>
                    <View style={styles.progressControls}>
                      <TouchableOpacity 
                        style={styles.progressBtn}
                        onPress={() => handleDecrementProgress(item.id, progress)}
                      >
                        <Text style={styles.progressBtnText}>-</Text>
                      </TouchableOpacity>
                      <View style={styles.progressInputWrapper}>
                        <Text style={styles.progressTextPrefix}>Ep</Text>
                        <TextInput
                          style={styles.progressTextInput}
                          keyboardType="numeric"
                          value={editingProgress[item.id] !== undefined ? editingProgress[item.id] : progress.toString()}
                          onChangeText={(val) => setEditingProgress(prev => ({ ...prev, [item.id]: val }))}
                          onEndEditing={() => {
                            const val = parseInt(editingProgress[item.id]);
                            if (!isNaN(val)) {
                              handleSetProgress(item.id, val, progress);
                            }
                            setEditingProgress(prev => {
                              const next = { ...prev };
                              delete next[item.id];
                              return next;
                            });
                          }}
                          selectTextOnFocus={true}
                          returnKeyType="done"
                        />
                      </View>
                      <TouchableOpacity 
                        style={styles.progressBtn}
                        onPress={() => handleIncrementProgress(item.id, progress)}
                      >
                        <Text style={styles.progressBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Action links */}
                  <View style={styles.actionsRow}>
                    <TouchableOpacity 
                      style={styles.watchNowButton} 
                      onPress={() => handleOpenStream(item)}
                    >
                      <Text style={styles.watchNowText}>▶ Watch Stream</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.editSlugButton}
                      onPress={() => handleStartEditSlug(item)}
                    >
                      <Text style={styles.editSlugText}>⚙ Slug</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              {index < watchlist.length - 1 && <View style={styles.separator} />}
            </View>
          );
        })
      )}

      {/* Edit Slug Modal Dialog */}
      <Modal
        visible={editingItem !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditingItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Configure AnimePahe Slug</Text>
            <Text style={styles.modalSubtitle}>
              Update the URL slug if search redirects fail to open the correct anime page.
            </Text>
            
            <TextInput
              style={styles.modalInput}
              value={newSlugText}
              onChangeText={setNewSlugText}
              placeholder="e.g. one-piece"
              placeholderTextColor="#666680"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.modalUrlPreview}>
              URL: https://animepahe.pw/anime/{newSlugText || '<slug>'}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => setEditingItem(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalSave]}
                onPress={handleSaveSlug}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  analyticsCard: {
    backgroundColor: '#11111a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1a1a2e',
    padding: 16,
    marginBottom: 20,
  },
  analyticsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666680',
    letterSpacing: 1,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#BB86FC',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#555570',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  genresSection: {
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
    paddingTop: 12,
  },
  genresSubTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#555570',
    letterSpacing: 1,
    marginBottom: 8,
  },
  genreBarRow: {
    marginBottom: 8,
  },
  genreBarInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  genreName: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '500',
  },
  genrePercent: {
    fontSize: 11,
    color: '#8888a0',
    fontWeight: '500',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#1a1a2e',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#BB86FC',
    borderRadius: 2,
  },
  searchContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  searchInput: {
    backgroundColor: '#11111a',
    borderWidth: 1,
    borderColor: '#1a1a2e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 14,
  },
  searchLoader: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  searchResultsContainer: {
    backgroundColor: '#11111a',
    borderWidth: 1,
    borderColor: '#1a1a2e',
    borderRadius: 12,
    maxHeight: 250,
    marginBottom: 20,
    overflow: 'hidden',
  },
  searchResultsScroll: {
    padding: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    padding: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  searchResultImage: {
    width: 36,
    height: 50,
    borderRadius: 6,
  },
  searchResultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  searchResultTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  searchResultGenres: {
    fontSize: 11,
    color: '#666680',
    marginTop: 2,
  },
  trackButton: {
    backgroundColor: '#BB86FC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  trackButtonText: {
    color: '#0a0a12',
    fontSize: 12,
    fontWeight: '700',
  },
  noResultsText: {
    padding: 16,
    color: '#666680',
    textAlign: 'center',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666680',
    letterSpacing: 1,
    marginTop: 10,
    marginBottom: 12,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubText: {
    color: '#666680',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  cardContainer: {
    width: '100%',
  },
  card: {
    backgroundColor: '#11111a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1a1a2e',
    flexDirection: 'row',
    padding: 12,
    overflow: 'hidden',
  },
  cardImage: {
    width: 85,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#1a1a2e',
  },
  cardContent: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  animeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    paddingRight: 8,
  },
  untrackSubButton: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  untrackText: {
    color: '#555570',
    fontSize: 12,
    fontWeight: '700',
  },
  badgesRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  countdownBadge: {
    backgroundColor: 'rgba(187, 134, 252, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countdownText: {
    fontSize: 11,
    color: '#BB86FC',
    fontWeight: '600',
  },
  latestEpisodeBadge: {
    backgroundColor: 'rgba(245, 0, 87, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 0, 87, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  latestEpisodeText: {
    fontSize: 11,
    color: '#F50057',
    fontWeight: '600',
  },
  trackingBadge: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  trackingBadgeText: {
    fontSize: 10,
    color: '#8888a0',
    fontWeight: '600',
  },
  genresRow: {
    marginBottom: 6,
  },
  genresListText: {
    fontSize: 11,
    color: '#666680',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0d0d15',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8888a0',
  },
  progressControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBtn: {
    backgroundColor: '#1a1a2e',
    borderRadius: 6,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  progressInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#22223b',
  },
  progressTextPrefix: {
    color: '#8888a0',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'monospace',
    marginRight: 2,
  },
  progressTextInput: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    width: 32,
    textAlign: 'center',
    padding: 0,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  watchNowButton: {
    flex: 1,
    backgroundColor: '#BB86FC',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchNowText: {
    color: '#0a0a12',
    fontSize: 11,
    fontWeight: '700',
  },
  editSlugButton: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editSlugText: {
    color: '#8888a0',
    fontSize: 11,
    fontWeight: '600',
  },
  separator: {
    height: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#11111a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1a1a2e',
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#666680',
    lineHeight: 18,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#0a0a12',
    borderWidth: 1,
    borderColor: '#1a1a2e',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 10,
  },
  modalUrlPreview: {
    fontSize: 11,
    color: '#BB86FC',
    fontFamily: 'monospace',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalCancel: {
    backgroundColor: '#1a1a2e',
  },
  modalCancelText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  modalSave: {
    backgroundColor: '#BB86FC',
  },
  modalSaveText: {
    color: '#0a0a12',
    fontSize: 13,
    fontWeight: '700',
  },
});