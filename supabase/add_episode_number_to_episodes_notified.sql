-- Add episode_number column to public.episodes_notified
ALTER TABLE public.episodes_notified 
ADD COLUMN IF NOT EXISTS episode_number INTEGER;

-- Create policy to allow public select (read) on episodes_notified
-- This allows the mobile app to fetch released episodes to show them on the watchlist dashboard.
CREATE POLICY "Allow public select on episodes_notified" 
ON public.episodes_notified FOR SELECT 
TO public 
USING (true);
