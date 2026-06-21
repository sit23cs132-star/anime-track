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
- Matches release titles against the watchlist using regular expressions to extract episode numbers and match title variations
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