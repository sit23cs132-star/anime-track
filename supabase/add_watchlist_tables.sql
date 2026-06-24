-- 1. Watchlist Table
CREATE TABLE IF NOT EXISTS public.watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_name TEXT NOT NULL UNIQUE,
    search_terms TEXT[] NOT NULL DEFAULT '{}',
    animepahe_slug TEXT,
    image_url TEXT,
    anilist_id INTEGER,
    genres TEXT[] NOT NULL DEFAULT '{}',
    next_airing_episode INTEGER,
    airing_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Watched Episodes Table
CREATE TABLE IF NOT EXISTS public.watched_episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID REFERENCES public.watchlist(id) ON DELETE CASCADE,
    episode_number INTEGER NOT NULL,
    watched_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (watchlist_id, episode_number)
);

-- Enable RLS
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watched_episodes ENABLE ROW LEVEL SECURITY;

-- Watchlist Policies
CREATE POLICY "Allow public select on watchlist" ON public.watchlist FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on watchlist" ON public.watchlist FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on watchlist" ON public.watchlist FOR UPDATE TO public USING (true);
CREATE POLICY "Allow public delete on watchlist" ON public.watchlist FOR DELETE TO public USING (true);
CREATE POLICY "Allow service role full access to watchlist" ON public.watchlist FOR ALL TO service_role USING (true);

-- Watched Episodes Policies
CREATE POLICY "Allow public select on watched_episodes" ON public.watched_episodes FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on watched_episodes" ON public.watched_episodes FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on watched_episodes" ON public.watched_episodes FOR UPDATE TO public USING (true);
CREATE POLICY "Allow public delete on watched_episodes" ON public.watched_episodes FOR DELETE TO public USING (true);
CREATE POLICY "Allow service role full access to watched_episodes" ON public.watched_episodes FOR ALL TO service_role USING (true);

-- Seed Watchlist Data
INSERT INTO public.watchlist (canonical_name, search_terms, animepahe_slug, image_url, anilist_id, genres)
VALUES 
(
  'Classroom of the Elite Season 4', 
  ARRAY['classroom of the elite season 4', 'classroom of the elite 4th season', 'youkoso jitsuryoku shijou shugi no kyoushitsu e 4th season', 'youkoso jitsuryoku shijou shugi no kyoushitsu e s4', 'classroom of the elite s4', 'youkoso jitsuryoku 4th', 'youkoso jitsuryoku s4', 'classroom of the elite 4'], 
  'youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e', 
  'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx175510-9b3o9b.jpg', 
  175510, 
  ARRAY['Drama', 'Psychological']
),
(
  'Re:ZERO -Starting Life in Another World-', 
  ARRAY['re zero starting life in another world', 're zero kara hajimeru isekai seikatsu', 're zero season 3', 're zero season 4', 're zero 3rd season', 're zero 4th season', 're zero'], 
  're-zero-kara-hajimeru-isekai-seikatsu', 
  'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21355-VfP943StVpB4.png', 
  21355, 
  ARRAY['Action', 'Adventure', 'Drama', 'Fantasy', 'Psychological']
),
(
  'Witch Hat Atelier', 
  ARRAY['witch hat atelier', 'tongari boushi no atelier', 'tongari boshi no atelier'], 
  'tongari-boushi-no-atelier', 
  'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx146077-O7v0F1Ld63Zc.jpg', 
  146077, 
  ARRAY['Adventure', 'Drama', 'Fantasy']
),
(
  'One Piece', 
  ARRAY['one piece'], 
  'one-piece', 
  'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/nx21-6v2vAdH442ve.jpg', 
  21, 
  ARRAY['Action', 'Adventure', 'Fantasy']
),
(
  'Dr. Stone Season 4', 
  ARRAY['dr stone science future cour 3', 'dr stone science future part 3', 'dr stone science future 3クール', 'dr stone science future cour 2', 'dr stone science future part 2', 'dr stone science future 2クール', 'dr stone science future', 'dr stone', 'doctor stone', 'dr stone s4', 'dr stone season 4'], 
  'dr-stone', 
  'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx160359-nscP6Xg6644K.png', 
  160359, 
  ARRAY['Adventure', 'Comedy', 'Sci-Fi']
)
ON CONFLICT (canonical_name) DO UPDATE SET 
  search_terms = EXCLUDED.search_terms,
  animepahe_slug = EXCLUDED.animepahe_slug,
  image_url = EXCLUDED.image_url,
  anilist_id = EXCLUDED.anilist_id,
  genres = EXCLUDED.genres;
