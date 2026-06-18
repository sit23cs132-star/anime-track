# Anime Tracker - Project Analysis

## Overview
A production-grade system that monitors anime releases via AniList GraphQL API and sends real-time push notifications the exact minute episodes air. Built with backend cron jobs (GitHub Actions) + React Native/Expo mobile app + Supabase (PostgreSQL).

## Architecture
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ AniList API │────▶│   Backend    │────▶│  Expo Push  │
│  (GraphQL)  │     │ (GitHub Act) │     │   Service   │
└─────────────┘     └──────┬───────┘     └──────┬──────┘
                           │                    │
                    ┌──────▼───────┐     ┌──────▼──────┐
                    │  Supabase    │     │  Mobile App │
                    │  (PostgreSQL)│     │(React Native)│
                    └──────────────┘     └─────────────┘
```

## Components

### 1. Backend (`/backend`) - Node.js + TypeScript
- **Trigger**: GitHub Actions cron (`*/5 * * * *` - every 5 min)
- **Entry**: `src/index.ts` → exports serverless handler + CLI runner
- **Dependencies**: `@supabase/supabase-js`, `firebase-admin`, `rss-parser`, `dotenv`

#### Core Services:
| File | Purpose |
|------|---------|
| `services/anilist.ts` | Fetches airing schedule from AniList GraphQL (15-min window, JP anime only, RELEASING status) |
| `services/supabase.ts` | CRUD for `device_tokens` & `episodes_notified` (uses service role key for backend writes) |
| `services/firebase.ts` | Sends push via Expo Push API (`exp.host`), batches 100 tokens/request |
| `services/rss.ts` | Alternative RSS feed parser (currently unused in main flow) |
| `utils/filter.ts` | **Core matching logic** - normalizes titles, matches against watchlist with aliases |

#### Watchlist (`filter.ts:27-80`):
| Anime | Search Terms |
|-------|-------------|
| Classroom of the Elite S4 | 7 variants (English, Romaji, Japanese, SubsPlease) |
| Re:ZERO | 6 variants |
| Witch Hat Atelier | 3 variants |
| One Piece | `one piece` |
| Dr. Stone S4 | 6 variants |

#### Deduplication:
`generateEpisodeKeyHash(canonicalName, episodeNumber)` creates unique hash stored in `episodes_notified` table.

---

### 2. Mobile App (`/mobile`) - React Native + Expo + TypeScript
- **Router**: Expo Router (file-based)
- **Styling**: NativeWind (Tailwind CSS) + custom midnight-dark theme (`#0a0a12` bg, `#BB86FC` purple accent)
- **Notifications**: `expo-notifications` (lazy-loaded, skipped in Expo Go)

#### Structure:
```
src/
├── providers.tsx         # Supabase client context (anon key)
├── services/
│   ├── supabase.ts      # Token registration (insert with duplicate handling)
│   └── notificationHandler.ts  # Push token fetch, channel setup, listeners
├── components/
│   ├── WatchlistDashboard.tsx  # Main screen - fetches episodes_notified, highlights <24h releases
│   └── NotificationSetup.tsx   # Settings screen - permission status, manual token registration
```

#### Key Features:
- Auto-registers push token on app launch (standalone builds only)
- Queries `episodes_notified` on mount → shows episode numbers + "NEW" badge for recent releases
- Android notification channel: `anime-releases` (MAX importance, vibration, DND bypass)

---

### 3. Database (`/supabase`)
```sql
-- device_tokens: Stores ExpoPushToken[xxx] per device
-- episodes_notified: Deduplication log (episode_key_hash UNIQUE, episode_number for UI)
```

#### Migrations:
1. `schema.sql` - Base tables + RLS policies (service_role full access, public insert tokens, public select episodes)
2. `add_episode_number_to_episodes_notified.sql` - Added `episode_number` column + public select policy
3. `fix_rls_device_tokens.sql` - Optional: allow anon UPDATE/SELECT on tokens

---

### 4. Deployment

#### Backend Options:
| Platform | Config | Schedule |
|----------|--------|----------|
| **GitHub Actions** (primary) | `.github/workflows/cron.yml` | `*/5 * * * *` |
| **Vercel** (alternative) | `vercel.json` | `*/15 * * * *` (functions: 30s, 256MB) |

#### Required GitHub Secrets:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FIREBASE_PROJECT_ID` (unused in current code - firebase-admin imported but not used for push)
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `RSS_FEED_URL` (optional)
- `CRON_SECRET` (optional, for serverless auth)

#### Mobile Build:
```bash
cd mobile && npm install -g eas-cli && eas login && eas init && eas build --platform android --profile preview
```

---

## Workflow Summary
1. **Cron triggers** (GitHub Actions every 5 min)
2. **Backend fetches** AniList airing schedule for last 15 minutes (UTC)
3. **Filter matches** against watchlist using English/Romaji/Japanese titles
4. **Deduplication check** via `episodes_notified.episode_key_hash`
5. **Push sent** via Expo Push Service to all registered device tokens
6. **Logged in Supabase** with episode number for mobile dashboard
7. **Mobile app** reads `episodes_notified` on launch → displays watchlist with episode numbers + "NEW" badges

---

## Key Design Decisions
- **15-min window** handles GitHub Actions scheduling jitter
- **Expo Push (not FCM directly)** - simpler, works cross-platform
- **Service role key** bypasses RLS for backend writes
- **Anon key** for mobile reads (public select policies)
- **Hash-based deduplication** survives title formatting differences
- **Standalone builds required** for push (Expo Go doesn't support native notifications)