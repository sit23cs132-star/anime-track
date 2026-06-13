import { SupabaseClient } from '@supabase/supabase-js';
import { useApp } from '../providers';

export interface DeviceTokenInsert {
  token: string;
  platform: 'ios' | 'android';
}

export function useSupabase(): SupabaseClient {
  const { supabase } = useApp();
  return supabase;
}

export async function registerDeviceToken(
  supabase: SupabaseClient,
  token: string,
  platform: 'ios' | 'android'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('device_tokens')
      .upsert({ token, platform }, { onConflict: 'token' });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}