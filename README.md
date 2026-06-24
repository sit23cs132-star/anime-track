# Anime Tracker - Cross-Platform Release Notifications

A production-grade system for monitoring anime releases and sending real-time push notifications the exact minute they air.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ SubsPlease  │────▶│   Backend    │────▶│  Expo Push  │
│ (RSS Feed)  │     │ (Vercel API) │     │   Service   │
└─────────────┘     └──────┬───────┘     └──────┬──────┘
                           │                    │
                    ┌──────▼───────┐     ┌──────▼──────┐
                    │  Supabase    │     │  Mobile App │
                    │  (PostgreSQL)│     │  (React     │
                    └──────────────┘     │   Native)   │
                           ▲             └─────────────┘
                           │
                    ┌──────┴───────┐
                    │ cron-job.org │
                    │ (5-Min Cron) │
                    └──────────────┘
```

## Components

### Backend (`/backend`)
- **Node.js + TypeScript (Vercel Serverless)**
- Hosted as a serverless function (`/api/check-feed`) on Vercel
- Triggered automatically every 5 minutes via an external cron service (**cron-job.org**)
- Queries the **SubsPlease RSS Feed** (configured for 1080p release stream)
- Fetches new releases dynamically as soon as English-subtitled download files are published in India
- Matches release titles against the **dynamic watchlist loaded from Supabase**
- Delivers **rich push notifications** containing cover art (`imageUrl` / attachments) and deep-linking streaming URLs using **Expo's Push Notification Service** (`exp.host`)
- Saves episode logs and numbers to **Supabase** for front-end synchronization

### Mobile (`/mobile`)
- **React Native + Expo + TypeScript**
- **Expo Router** for page routing
- Midnight-dark custom theme with purple accent
- **expo-notifications** client integration to register device tokens
- **Dynamic Watchlist Management**: Live AniList API search bar to add and remove shows directly from your phone
- **Live Countdown Timers**: Automatically tracks and displays live countdowns (e.g. `Airs in 3h 12m`) for scheduled releases
- **Direct Streaming Integration**: "Watch Stream" buttons on dashboard cards and tap handlers on notifications that open stream episodes directly on `animepahe.pw`
- **Episode Checklist Tracker**: In-app `+` / `-` progress controls to log watched episodes to Supabase
- **Analytics Dashboard**: Dynamic calculations of total tracked shows, total watched episodes, total watch time (scaled at 24 minutes per episode), and favorite genres progress bars

### Database (`/supabase`)
- `device_tokens` - Registered Expo Push tokens per device
- `episodes_notified` - State tracking table to guarantee zero duplicate notification delivery
- `watchlist` - Dynamic list of tracked anime, their search aliases, genres, and cover art URLs
- `watched_episodes` - Watched progress logging table for analytics computations

## Watchlist & Matching Aliases

The watchlist is fully dynamic and managed directly from the mobile app's search bar. It is pre-seeded with:
1. **Classroom of the Elite Season 4**
2. **Re:ZERO -Starting Life in Another World-**
3. **Witch Hat Atelier**
4. **One Piece**
5. **Dr. Stone Season 4**

*All search terms and aliases for SubsPlease release matching are computed automatically and stored in Supabase when you add an anime from the mobile search bar.*

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

### 3. Vercel Backend & Cron Setup
The backend runs as a Serverless Function on **Vercel** and is triggered by **cron-job.org**.

#### A. Deploy to Vercel
1. Sign in to your Vercel account and import your repository.
2. In the project setup, click **Edit** next to **Root Directory** and set it to `backend`.
3. Set the **Framework Preset** to **Other**.
4. Under **Build & Development Settings**, toggle **Build Command** override to **ON** and leave it completely **empty/blank**.
5. Add the following **Environment Variables**:
   - `SUPABASE_URL`: Your Supabase Project API endpoint.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role API key.
   - `CRON_SECRET`: A secure random secret key to protect your API from unauthorized trigger requests.
   - `RSS_FEED_URL` (optional): Set to a custom SubsPlease feed URL (defaults to 1080p).
6. Click **Deploy**.

#### B. Setup Cron Job Trigger
1. Go to [cron-job.org](https://cron-job.org/) and create a free account.
2. Click **Create Cronjob**.
3. Set the **URL** to: `https://<your-vercel-domain>.vercel.app/api/check-feed?secret=<YOUR_CRON_SECRET>`
4. Set the **Schedule** to **Every 5 minutes** (or custom interval).
5. Click **Create**.

Your backend is now fully active, checked every 5 minutes, and will securely dispatch notifications! 🚀

---

## License

MIT