// ============================================
// CLUB PYP — Supabase Data Hooks
// ============================================
// Smart hooks that use Supabase when connected,
// or fall back to Zustand demo store.
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useAppStore } from '../stores/appStore';

// ─── Types ──────────────────────────────────

export interface SupaMatchMarket {
  id: string;
  realTeamHomeId: string;
  realTeamAwayId: string;
  multiplierHome: number;
  multiplierDraw: number;
  multiplierAway: number;
  startTime: string;
  status: 'OPEN' | 'CLOSED' | 'FINISHED';
  result: 'HOME_WIN' | 'DRAW' | 'AWAY_WIN' | 'PENDING';
  home_team?: { name: string; logoUrl: string | null };
  away_team?: { name: string; logoUrl: string | null };
}

export interface SupaPredictionTicket {
  id: string;
  userId: string;
  totalAmount: number;
  potentialReturn: number;
  status: 'PENDING' | 'HIT' | 'MISSED';
  createdAt: string;
  ticket_items?: SupaTicketItem[];
}

export interface SupaTicketItem {
  id: string;
  predictionTicketId: string;
  matchMarketId: string;
  selectedOutcome: 'HOME_WIN' | 'DRAW' | 'AWAY_WIN';
  lockedMultiplier: number;
  match_market?: SupaMatchMarket;
}

export interface SupaLeaderboardEntry {
  id: string;
  name: string;
  clCoins: number;
  isBankrupt: boolean;
}

export interface SupaTransaction {
  id: string;
  userId: string;
  amountCOP: number;
  coinsAdded: number;
  type: 'PREMIUM_PASS' | 'LIFESAVER_TOPUP' | 'REWARD_REDEMPTION' | 'BET_PLACED' | 'WINNINGS_PAID' | 'STORE_REDEMPTION' | 'COINS_EARNED';
  referenceId: string | null;
  status: string;
  createdAt: string;
}

// ─── Hook: useIsLive ────────────────────────

export function useIsLive(): boolean {
  const { authUser } = useAuth();
  return isSupabaseConfigured && !!authUser;
}

// ─── Hook: useMatchMarkets ──────────────────

export function useMatchMarkets(statusFilter?: string) {
  const live = useIsLive();
  const demoMatches = useAppStore((s) => s.matches);
  const demoFilter = useAppStore((s) => s.activeFilter);

  const [matches, setMatches] = useState<SupaMatchMarket[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!live) { setLoading(false); return; }
    try {
      let query = supabase
        .from('match_markets')
        .select(`
          *,
          home_team:real_teams!match_markets_realTeamHomeId_fkey(name, logoUrl),
          away_team:real_teams!match_markets_realTeamAwayId_fkey(name, logoUrl)
        `)
        .order('startTime', { ascending: true });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter.toUpperCase());
      }

      const { data, error } = await query;
      if (error) throw error;
      setMatches(data as SupaMatchMarket[]);
    } catch (err) {
      console.error('Error loading match markets:', err);
    } finally {
      setLoading(false);
    }
  }, [live, statusFilter]);

  useEffect(() => { load(); }, [load]);

  if (!live) {
    const filtered = demoFilter === 'all'
      ? demoMatches
      : demoMatches.filter((m) => m.league === demoFilter);

    return { matches: filtered as any, loading: false, reload: () => {} };
  }

  return { matches, loading, reload: load };
}

// ─── Hook: useMatchMarketById ───────────────

export function useMatchMarketById(id: string | undefined) {
  const live = useIsLive();
  const getMatch = useAppStore((s) => s.getMatch);

  const [match, setMatch] = useState<SupaMatchMarket | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!live || !id) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('match_markets')
        .select(`
          *,
          home_team:real_teams!match_markets_realTeamHomeId_fkey(name, logoUrl),
          away_team:real_teams!match_markets_realTeamAwayId_fkey(name, logoUrl)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setMatch(data as SupaMatchMarket);
    } catch (err) {
      console.error('Error loading match market:', err);
      setMatch(null);
    } finally {
      setLoading(false);
    }
  }, [live, id]);

  useEffect(() => { load(); }, [load]);

  if (!live) {
    const demoMatch = id ? getMatch(id) : undefined;
    return { match: demoMatch as any, loading: false, reload: () => {} };
  }

  return { match, loading, reload: load };
}

// ─── Hook: useMyTickets ─────────────────────

export function useMyTickets(statusFilter?: string) {
  const live = useIsLive();
  const { authUser } = useAuth();
  const demoPredictions = useAppStore((s) => s.predictions);

  const [tickets, setTickets] = useState<SupaPredictionTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!live || !authUser) { setLoading(false); return; }
    try {
      let query = supabase
        .from('prediction_tickets')
        .select(`
          *,
          ticket_items(
            *,
            match_market:match_markets(
               status, result, startTime,
               home_team:real_teams!match_markets_realTeamHomeId_fkey(name),
               away_team:real_teams!match_markets_realTeamAwayId_fkey(name)
            )
          )
        `)
        .eq('userId', authUser.id)
        .order('createdAt', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter.toUpperCase());
      }

      const { data, error } = await query;
      if (error) throw error;
      setTickets(data as SupaPredictionTicket[]);
    } catch (err) {
      console.error('Error loading tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [live, authUser, statusFilter]);

  useEffect(() => { load(); }, [load]);

  if (!live) {
    const filtered = statusFilter && statusFilter !== 'all'
      ? demoPredictions.filter((b: any) => b.status === statusFilter.toUpperCase())
      : demoPredictions;
    return { tickets: filtered as any, loading: false, reload: () => {} };
  }

  return { tickets, loading, reload: load };
}

// ─── Hook: useLeaderboard ───────────────────

export function useLeaderboard(limit = 20) {
  const live = useIsLive();
  const { authUser } = useAuth();
  const demoLeaderboard = useAppStore((s) => s.leaderboard);
  const demoRank = useAppStore((s) => s.myRank);

  const [players, setPlayers] = useState<SupaLeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!live) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .rpc('get_leaderboard', { p_limit: limit });

      if (error) throw error;
      setPlayers(data as any[]);

      if (authUser) {
        const idx = data?.findIndex((p: any) => p.id === authUser.id) ?? -1;
        setMyRank(idx >= 0 ? idx + 1 : 0);
      }
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, [live, authUser, limit]);

  useEffect(() => { load(); }, [load]);

  if (!live) {
    return { players: demoLeaderboard as any, myRank: demoRank, loading: false, reload: () => {} };
  }

  return { players, myRank, loading, reload: load };
}

// ─── Hook: useTransactions ──────────────────

export function useTransactions() {
  const live = useIsLive();
  const { authUser } = useAuth();
  const demoTxns = useAppStore((s) => s.transactions);

  const [transactions, setTransactions] = useState<SupaTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!live || !authUser) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('userId', authUser.id)
        .order('createdAt', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data as SupaTransaction[]);
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [live, authUser]);

  useEffect(() => { load(); }, [load]);

  if (!live) {
    return { transactions: demoTxns as any, loading: false, reload: () => {} };
  }

  return { transactions, loading, reload: load };
}

// ─── Action: Submit Ticket via RPC ──────────

export async function submitTicketRPC(
  selections: { matchMarketId: string; outcome: 'HOME_WIN' | 'DRAW' | 'AWAY_WIN' }[],
  amount: number
) {
  const { data, error } = await supabase.rpc('submit_ticket', {
    p_selections: selections,
    p_amount: amount,
  });

  if (error) throw new Error(error.message);
  return data;
}
