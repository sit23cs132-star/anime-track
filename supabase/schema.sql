-- 1. Device Tokens Table
-- Stores FCM tokens for each user device to enable push notifications.
CREATE TABLE IF NOT EXISTS public.device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL, -- 'ios' or 'android'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Episodes Notified Table
-- Prevents duplicate notifications by tracking which episodes have already been processed.
CREATE TABLE IF NOT EXISTS public.episodes_notified (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_key_hash TEXT NOT NULL UNIQUE, -- Unique hash based on anime title + episode number
    title TEXT NOT NULL,
    notified_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for faster lookups on hashes
CREATE INDEX IF NOT EXISTS idx_episode_key_hash ON public.episodes_notified(episode_key_hash);

-- Enable Row Level Security (RLS) for security (Optional but recommended for production)
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes_notified ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow authenticated inserts for device tokens (Mobile app side)
CREATE POLICY "Allow public to insert their own device token" 
ON public.device_tokens FOR INSERT 
WITH CHECK (true);

-- Policy to allow backend (service role) full access
CREATE POLICY "Allow service role full access" 
ON public.device_tokens FOR ALL 
TO service_role 
USING (true);

CREATE POLICY "Allow service role full access to episodes" 
ON public.episodes_notified FOR ALL 
TO service_role 
USING (true);
