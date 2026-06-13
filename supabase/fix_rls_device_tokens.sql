-- Fix: Allow anon role to update their own device token (needed for upsert)
-- Run this in Supabase SQL Editor if you want to restore upsert behavior in future

CREATE POLICY "Allow public to update their own device token"
ON public.device_tokens FOR UPDATE
USING (true)
WITH CHECK (true);

-- Also allow anon to select (needed for some client-side checks)
CREATE POLICY "Allow public to read device tokens"
ON public.device_tokens FOR SELECT
USING (true);
