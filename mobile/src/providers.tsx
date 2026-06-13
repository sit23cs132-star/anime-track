'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

interface AppContextType {
  supabase: SupabaseClient;
  isReady: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function Providers({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient(supabaseUrl, supabaseAnonKey));
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize any async setup here
    setIsReady(true);
  }, []);

  if (!isReady) {
    return <View style={styles.loadingContainer} />;
  }

  return (
    <AppContext.Provider value={{ supabase, isReady }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within a Providers');
  }
  return context;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a12',
    justifyContent: 'center',
    alignItems: 'center',
  },
});