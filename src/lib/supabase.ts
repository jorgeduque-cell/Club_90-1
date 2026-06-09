// ============================================
// CLUB 90 — Supabase Client (Frontend)
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    '⚠️ CLUB 90: Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env. ' +
    'La app funcionará en modo demo sin conexión a Supabase.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export interface UserProfile {
  id: string;
  phone: string;
  name: string;
  clCoins: number;
  accountTier: 'GUEST' | 'PREMIUM';
  isBankrupt: boolean;
  storedLifeSavers: number;
  currentStreak: number;
  role: 'PLAYER' | 'ADMIN' | 'CASHIER';
  createdAt?: string;
}
