# Anime Tracker - Cross-Platform Release Notifications

A production-grade system for monitoring anime releases and sending real-time push notifications.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  RSS Feed   │────▶│  Backend     │────▶│  Firebase   │
│  (GitHub)   │     │  (Vercel)    │     │  (FCM)      │
└─────────────┘     └──────┬───────┘     └──────┬──────┘
                           │                    │
                    ┌──────▼───────┐     ┌──────▼──────┐
                    │  Supabase    │     │  Mobile App │
                    │  (PostgreSQL)│     │  (React     │
                    └──────────────┘     │   Native)   │
                                         └─────────────┘
```

## Components

### Backend (`/backend`)
- **Node.js + TypeScript** serverless function
- Runs every 15 minutes via Vercel Cron or GitHub Actions
- Fetches RSS feed from `https://raw.githubusercontent.com/ArjixGamer/gogoanime-rss/main/animepahe/animepahe-rss.xml`
- Matches against watchlist using fuzzy string matching
- Sends FCM push notifications via Firebase Admin SDK
- Stores state in Supabase (PostgreSQL)

### Mobile (`/mobile`)
- **React Native + Expo + TypeScript**
- **Expo Router** for navigation
- **NativeWind (Tailwind CSS)** for styling
- **expo-notifications** for FCM/APNs integration
- Midnight-dark theme with purple accent

### Database (`/supabase`)
- `device_tokens` - FCM tokens per device
- `episodes_notified` - Deduplication log with unique hashes

## Watchlist

| Anime | Search Terms |
|-------|--------------|
| Classroom of the Elite 4th Season | "Classroom of the Elite Season 4", "Youkoso Jitsuryoku Shijou Shugi no Kyoushitsu e 4th Season", "2-nensei-hen" |
| Re:ZERO Season 4 | "Re:Zero kara Hajimeru Isekai Seikatsu 4th Season", "Re:ZERO" |
| Witch Hat Atelier | "Tongari Boushi no Atelier", "Witch Hat Atelier" |
| One Piece | "One Piece" |

## Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

### 2. Mobile Setup

```bash
cd mobile
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npx expo start
```

### 3. Supabase Setup

Run the SQL in `supabase/schema.sql` in your Supabase SQL Editor.

### 4. Firebase Setup

1. Create Firebase project
2. Enable Cloud Messaging
3. Generate service account key (Project Settings > Service Accounts)
4. Add credentials to backend `.env`
5. For mobile: Add `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)

## Deployment

### Vercel (Recommended)

1. Connect repo to Vercel
2. Set Root Directory to `backend`
3. Add Environment Variables from `.env.example`
4. Vercel Cron will auto-run every 15 minutes

### GitHub Actions (Alternative)

1. Add secrets to GitHub repository settings
2. Workflow at `.github/workflows/cron.yml` runs every 15 minutes

## Environment Variables

### Backend
| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Service account email |
| `FIREBASE_PRIVATE_KEY` | Private key (with `\n` newlines) |
| `RSS_FEED_URL` | RSS feed URL (default: GitHub mirror) |
| `CRON_SECRET` | Optional secret for endpoint protection |

### Mobile
| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Anon public key |

## API Endpoint

```
POST /api/check-feed
Headers: x-cron-secret: <CRON_SECRET>
```

Returns:
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "checked": 50,
  "matched": 2,
  "notified": 1,
  "errors": []
}
```

## Development

### Backend Commands
```bash
npm run dev      # Run with ts-node
npm run build    # Compile to dist/
npm start        # Run compiled JS
```

### Mobile Commands
```bash
npm start        # Start Expo dev server
npm run android  # Run on Android emulator
npm run ios      # Run on iOS simulator
npm run web      # Run in browser
```

## License

MIT