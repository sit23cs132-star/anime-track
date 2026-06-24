import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export interface DeviceTokenRow {
  id: string;
  token: string;
  platform: 'ios' | 'android';
  created_at: string;
}

export interface EpisodeNotifiedRow {
  id: string;
  episode_key_hash: string;
  title: string;
  episode_number: number;
  notified_at: string;
}

export async function getActiveDeviceTokens(): Promise<string[]> {
  const { data, error } = await supabase
    .from('device_tokens')
    .select('token');

  if (error) {
    console.error('Error fetching device tokens:', error);
    throw error;
  }

  return data.map((row) => row.token);
}

export async function hasEpisodeBeenNotified(episodeKeyHash: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('episodes_notified')
    .select('id')
    .eq('episode_key_hash', episodeKeyHash)
    .maybeSingle();

  if (error) {
    console.error('Error checking episode:', error);
    throw error;
  }

  return !!data;
}

export async function markEpisodeAsNotified(episodeKeyHash: string, title: string, episodeNumber: number): Promise<void> {
  const { error } = await supabase
    .from('episodes_notified')
    .insert({ 
      episode_key_hash: episodeKeyHash, 
      title,
      episode_number: episodeNumber 
    });

  if (error) {
    console.error('Error marking episode as notified:', error);
    throw error;
  }
}

export async function registerDeviceToken(token: string, platform: 'ios' | 'android'): Promise<void> {
  const { error } = await supabase
    .from('device_tokens')
    .upsert({ token, platform }, { onConflict: 'token' });

  if (error) {
    console.error('Error registering device token:', error);
    throw error;
  }
}

export interface WatchlistRow {
  id: string;
  canonical_name: string;
  search_terms: string[];
  animepahe_slug?: string;
  image_url?: string;
  anilist_id?: number;
  genres: string[];
  next_airing_episode?: number;
  airing_at?: string;
  created_at?: string;
}

export async function getWatchlist(): Promise<WatchlistRow[]> {
  const { data, error } = await supabase
    .from('watchlist')
    .select('*');

  if (error) {
    console.error('Error fetching watchlist from Supabase:', error);
    throw error;
  }

  return data || [];
}