# Anime Tracker - Cross-Platform Release Notifications

A production-grade system for monitoring anime releases and sending real-time push notifications.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  RSS Feed   │────▶│  Backend     │────▶│  Expo Push  │
│(SubsPlease) │     │ (GitHub Act) │     │   Service   │
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
- Triggered automatically every 15 minutes via **GitHub Actions** (`cron.yml`)
- Fetches RSS feed from **SubsPlease** (`https://subsplease.org/rss/?r=1080`)
- Matches releases against the watchlist using normalized title comparison
- Delivers push notifications globally using **Expo's Push Notification Service** (`exp.host`)
- Handles deduplication and records status in **Supabase**

### Mobile (`/mobile`)
- **React Native + Expo + TypeScript**
- **Expo Router** for page routing
- Midnight-dark custom theme with purple accent
- **expo-notifications** client integration to register device tokens
- Self-recovering: includes built-in fallback configurations for Supabase connection parameters to prevent startup crashes in production builds

### Database (`/supabase`)
- `device_tokens` - Registered Expo Push tokens per device
- `episodes_notified` - State tracking table to guarantee zero duplicate notification delivery

## Watchlist & Matching Aliases

| Anime | Search Terms |
|---|---|
| **Classroom of the Elite Season 4** | `youkoso jitsuryoku shijou shugi no kyoushitsu e s4`, `classroom of the elite season 4`, `classroom of the elite s4` |
| **Re:ZERO -Starting Life in Another World-** | `re zero kara hajimeru isekai seikatsu`, `re:zero kara hajimeru isekai seikatsu` |
| **Witch Hat Atelier** | `tongari boushi no atelier`, `witch hat atelier` |
| **One Piece** | `one piece` |
| **Dr. Stone Season 4** | `dr stone s4`, `dr. stone s4`, `dr stone science future` |

---

## Deployment & Setup Guide

### 1. Database Configuration
Run the SQL definitions from `supabase/schema.sql` in your Supabase SQL editor. This sets up the tracking and token tables.

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
GitHub Actions handles all automated RSS parsing and notification delivery. Add the following repository secrets to your GitHub project:

- `SUPABASE_URL`: Your Supabase Project API endpoint
- `SUPABASE_SERVICE_ROLE_KEY`: Service role API key (bypasses RLS for backend write access)
- `RSS_FEED_URL`: RSS feed URL (defaults to `https://subsplease.org/rss/?r=1080`)

Once secrets are set, the workflow at `.github/workflows/cron.yml` executes every 15 minutes, checking the feed, comparing titles, and dispatching pushes automatically! 🚀

---

## License

MIT