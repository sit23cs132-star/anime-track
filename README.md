# Anime Tracker - Cross-Platform Release Notifications

A production-grade system for monitoring anime releases and sending real-time push notifications the exact minute they air.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ AniList API │────▶│  Backend     │────▶│  Expo Push  │
│  (GraphQL)  │     │ (GitHub Act) │     │   Service   │
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
- **Node.js + TypeScript**
- Triggered automatically every 5 minutes via **GitHub Actions** (`cron.yml`)
- Queries the **AniList GraphQL Airing Schedule API**
- Fetches all anime airing within a rolling 15-minute window (ensures no releases are missed if GitHub Actions experiences run delays)
- Matches releases against the watchlist by performing checks on English, Romaji, and Japanese titles
- Delivers push notifications globally using **Expo's Push Notification Service** (`exp.host`)
- Saves episode logs and numbers to **Supabase** for front-end synchronization

### Mobile (`/mobile`)
- **React Native + Expo + TypeScript**
- **Expo Router** for page routing
- Midnight-dark custom theme with purple accent
- **expo-notifications** client integration to register device tokens
- Dynamic database synchronization: queries Supabase on launch to pull exact latest episode numbers and highlight newly released episodes (released within last 24 hours)

### Database (`/supabase`)
- `device_tokens` - Registered Expo Push tokens per device
- `episodes_notified` - State tracking table to guarantee zero duplicate notification delivery (stores `episode_number` to feed the client dashboard)

## Watchlist & Matching Aliases

| Anime | Search Terms Checked |
|---|---|
| **Classroom of the Elite Season 4** | `classroom of the elite season 4`, `classroom of the elite 4th season`, `youkoso jitsuryoku shijou shugi no kyoushitsu e 4th season`, `youkoso jitsuryoku shijou shugi no kyoushitsu e s4`, `classroom of the elite s4`, `youkoso jitsuryoku 4th`, `youkoso jitsuryoku s4` |
| **Re:ZERO -Starting Life in Another World-** | `re zero starting life in another world`, `re zero kara hajimeru isekai seikatsu`, `re zero season 3`, `re zero season 4`, `re zero 3rd season`, `re zero 4th season` |
| **Witch Hat Atelier** | `witch hat atelier`, `tongari boushi no atelier`, `tongari boshi no atelier` |
| **One Piece** | `one piece` |
| **Dr. Stone Season 4** | `dr stone`, `dr stone science future`, `doctor stone`, `dr stone s4`, `dr stone season 4` |

---

## Deployment & Setup Guide

### 1. Database Configuration
Run the SQL definitions from `supabase/schema.sql` (and migration scripts) in your Supabase SQL editor. This sets up the tracking, episode metadata, and token tables.

### 2. Standalone Android Client Build
To build a standalone production APK using Expo Application Services (EAS):

```bash
cd mobile
# Install EAS CLI globally if not already installed
npm install -g eas-cli
# Log in to your Expo account
eas login
# Initialize the EAS project
eas init
# Build the standalone APK
eas build --platform android --profile preview
```

### 3. Backend Workflow Setup
GitHub Actions handles all automated schedule parsing and notification delivery. Add the following repository secrets to your GitHub project:

- `SUPABASE_URL`: Your Supabase Project API endpoint
- `SUPABASE_SERVICE_ROLE_KEY`: Service role API key (bypasses RLS for backend write access)

Once secrets are set, the workflow at `.github/workflows/cron.yml` executes every 5 minutes, checking AniList, comparing titles, and dispatching pushes automatically! 🚀

---

## License

MIT