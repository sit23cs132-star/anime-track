import { AiringEpisode } from '../services/anilist';

/**
 * Normalizes a string for comparison by:
 * - Converting to lowercase
 * - Removing special characters (punctuation, symbols)
 * - Collapsing multiple whitespaces
 * - Trimming
 */
export function normalizeString(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // Remove punctuation/symbols, keep unicode letters/numbers
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
}

/**
 * Watchlist configuration with all possible title variations for matching.
 * Each entry contains the canonical name and an array of search terms.
 */
export interface WatchlistEntry {
  canonicalName: string;
  searchTerms: string[];
}

export const WATCHLIST: WatchlistEntry[] = [
  {
    canonicalName: 'Classroom of the Elite Season 4',
    searchTerms: [
      // AniList titles
      'classroom of the elite season 4',
      'classroom of the elite 4th season',
      'youkoso jitsuryoku shijou shugi no kyoushitsu e 4th season',
      'youkoso jitsuryoku shijou shugi no kyoushitsu e s4',
      // SubsPlease alternate
      'classroom of the elite s4',
      'youkoso jitsuryoku 4th',
      'youkoso jitsuryoku s4',
    ],
  },
  {
    canonicalName: 'Re:ZERO -Starting Life in Another World-',
    searchTerms: [
      // AniList titles
      're zero starting life in another world',
      're zero kara hajimeru isekai seikatsu',
      're zero season 3',
      're zero season 4',
      're zero 3rd season',
      're zero 4th season',
    ],
  },
  {
    canonicalName: 'Witch Hat Atelier',
    searchTerms: [
      // AniList English + Romaji
      'witch hat atelier',
      'tongari boushi no atelier',
      'tongari boshi no atelier',
    ],
  },
  {
    canonicalName: 'One Piece',
    searchTerms: [
      'one piece',
    ],
  },
  {
    canonicalName: 'Dr. Stone Season 4',
    searchTerms: [
      // AniList titles
      'dr stone',
      'dr stone science future',
      'doctor stone',
      'dr stone s4',
      'dr stone season 4',
    ],
  },
];

/**
 * Generates a unique hash for an episode based on canonical title and episode number.
 * This is used for deduplication in the database.
 */
export function generateEpisodeKeyHash(canonicalName: string, episodeNumber: number): string {
  const base = `${canonicalName.toLowerCase().replace(/\s+/g, '-')}-ep-${episodeNumber}`;
  // Simple hash for demo; in production use crypto.createHash('sha256').update(base).digest('hex')
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    const char = base.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `ep_${Math.abs(hash).toString(16)}`;
}

/**
 * Extracts episode number from a title string.
 * Handles formats like "Episode 1", "Ep 1", "#1", "第1話", etc.
 */
export function extractEpisodeNumber(title: string): number | null {
  const patterns = [
    /episode\s*(\d+)/i,
    /ep\s*(\d+)/i,
    /#(\d+)/,
    /第(\d+)話/,
    /(\d+)\s*$/,
    /^\s*(\d+)\s*[-–:]/,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > 0 && num < 5000) {
        return num;
      }
    }
  }

  // Fallback: look for any standalone number
  const fallbackMatch = title.match(/\b(\d{1,4})\b/);
  if (fallbackMatch) {
    const num = parseInt(fallbackMatch[1], 10);
    if (num > 0 && num < 5000) return num;
  }

  return null;
}

/**
 * Matches an RSS item title against the watchlist.
 * Returns the matched watchlist entry and episode number if found.
 */
export function matchAgainstWatchlist(title: string): { entry: WatchlistEntry; episodeNumber: number } | null {
  const normalizedTitle = normalizeString(title);
  const episodeNumber = extractEpisodeNumber(title);

  if (!episodeNumber) {
    return null;
  }

  for (const entry of WATCHLIST) {
    for (const term of entry.searchTerms) {
      const normalizedTerm = normalizeString(term);
      if (normalizedTitle.includes(normalizedTerm)) {
        return { entry, episodeNumber };
      }
    }
  }

  return null;
}

/**
 * Matches an AniList airing episode against the watchlist.
 * Checks all three title variants: English, Romaji, and Native.
 * Returns the matched watchlist entry if found.
 */
export function matchAiringSchedule(
  episode: AiringEpisode
): { entry: WatchlistEntry } | null {
  // Build list of all titles to check from AniList response
  const titlesToCheck = [
    episode.titleEnglish,
    episode.titleRomaji,
    episode.titleNative,
  ].filter(Boolean);

  for (const entry of WATCHLIST) {
    for (const term of entry.searchTerms) {
      const normalizedTerm = normalizeString(term);
      for (const title of titlesToCheck) {
        const normalizedTitle = normalizeString(title);
        if (normalizedTitle.includes(normalizedTerm)) {
          console.log(
            `[Filter] Matched "${entry.canonicalName}" via AniList title "${title}" using search term "${term}"`
          );
          return { entry };
        }
      }
    }
  }

  return null;
}