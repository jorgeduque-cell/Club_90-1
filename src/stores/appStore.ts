// ============================================
// CLUB PYP — App Store (Zustand - Local State)
// ============================================
// Manages ALL app state for Demo Mode.
// When Supabase is configured, hooks will use
// real data. In demo mode, this store IS the db.

import { create } from 'zustand';

// ─── Business Constants (PLAN_MUNDIAL §1) ─

export const MAX_STAKE = 2_000;
export const MAX_MULTIPLIER_CAP = 5.00;
export const WHATSAPP_BOT_NUMBER = '573001234567';

// §6 Recharge Limits (Anti Pay-to-Win)
export const RECHARGE_COINS = 5_000;
export const RECHARGE_COP = 20_000;
export const RECHARGE_MIN_BALANCE = 2_000;
export const RECHARGE_WEEKLY_CAP = 2;

// ─── Types ──────────────────────────────────

export type PredictionType = 'HOME_WIN' | 'DRAW' | 'AWAY_WIN';
export type PredictionStatus = 'PENDING' | 'WON' | 'LOST';
export type MatchStatus = 'OPEN' | 'CLOSED' | 'FINISHED';

export interface DemoMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeInitials: string;
  awayInitials: string;
  date: string;
  startTime: string;
  league: string;
  multipliers: { home: number; draw: number; away: number };
  pools: { home: number; draw: number; away: number };
  isLive: boolean;
  status: MatchStatus;
  score?: { home: number; away: number };
  minute?: number;
  stats?: MatchStats;
}

export interface MatchStats {
  possession: { home: number; away: number };
  shots: { home: number; away: number };
  shotsOnTarget: { home: number; away: number };
  corners: { home: number; away: number };
  fouls: { home: number; away: number };
  yellowCards: { home: number; away: number };
  redCards: { home: number; away: number };
}

export interface DemoPrediction {
  id: string;
  matchId: string;
  match: string;
  league: string;
  prediction: PredictionType;
  predictionLabel: string;
  amount: number;
  multiplier: number;
  estimatedReturn: number;
  status: PredictionStatus;
  isLive: boolean;
  earlyReturn?: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  label: string;
  date: string;
  amount: number;
  amountLabel: string;
  icon: string;
  category: 'prediction_win' | 'prediction_submit' | 'bonus' | 'early_return' | 'redeem' | 'topup';
}

export interface LeaderboardPlayer {
  rank: number;
  name: string;
  points: number;
  avatar: string;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  createdAt: number;
}

// ─── Initial Demo Data ──────────────────────

const DEMO_MATCHES: DemoMatch[] = [
  {
    id: 'match-001',
    homeTeam: 'Los Troncos FC',
    awayTeam: 'Real Albañil',
    homeInitials: 'LT',
    awayInitials: 'RA',
    date: 'Sábado, 10:00 AM',
    startTime: '2026-04-05T15:00:00Z',
    league: 'Kings League',
    multipliers: { home: 2.45, draw: 3.10, away: 2.85 },
    pools: { home: 12000, draw: 8000, away: 10000 },
    isLive: false,
    status: 'OPEN',
  },
  {
    id: 'match-002',
    homeTeam: 'C.A. Bananero',
    awayTeam: 'Pibe Valderrama XI',
    homeInitials: 'CB',
    awayInitials: 'PV',
    date: 'Sábado, 01:30 PM',
    startTime: '2026-04-05T18:30:00Z',
    league: 'Kings League',
    multipliers: { home: 1.90, draw: 3.40, away: 4.20 },
    pools: { home: 18000, draw: 7500, away: 4500 },
    isLive: false,
    status: 'OPEN',
  },
  {
    id: 'match-003',
    homeTeam: 'Chilangos FC',
    awayTeam: 'Villa Miseria Utd',
    homeInitials: 'CH',
    awayInitials: 'VM',
    date: 'Domingo, 09:00 AM',
    startTime: '2026-04-06T14:00:00Z',
    league: 'Torneo Local',
    multipliers: { home: 2.15, draw: 2.95, away: 3.10 },
    pools: { home: 11500, draw: 9000, away: 9500 },
    isLive: false,
    status: 'OPEN',
  },
  {
    id: 'match-004',
    homeTeam: 'Saiyans FC',
    awayTeam: 'Porcinos FC',
    homeInitials: 'SF',
    awayInitials: 'PF',
    date: 'EN VIVO',
    startTime: '2026-03-30T22:00:00Z',
    league: 'Kings League',
    multipliers: { home: 1.65, draw: 3.80, away: 5.00 },
    pools: { home: 25000, draw: 6000, away: 4000 },
    isLive: true,
    status: 'OPEN',
    score: { home: 2, away: 1 },
    minute: 72,
    stats: {
      possession: { home: 55, away: 45 },
      shots: { home: 12, away: 8 },
      shotsOnTarget: { home: 4, away: 3 },
      corners: { home: 6, away: 2 },
      fouls: { home: 10, away: 14 },
      yellowCards: { home: 1, away: 3 },
      redCards: { home: 0, away: 0 },
    },
  },
  {
    id: 'match-005',
    homeTeam: 'Aniquiladores FC',
    awayTeam: 'Jijantes FC',
    homeInitials: 'AN',
    awayInitials: 'JJ',
    date: 'Lunes, 08:00 PM',
    startTime: '2026-04-07T01:00:00Z',
    league: 'Kings League',
    multipliers: { home: 2.10, draw: 3.15, away: 3.50 },
    pools: { home: 14000, draw: 8000, away: 8000 },
    isLive: false,
    status: 'OPEN',
  },
  {
    id: 'match-006',
    homeTeam: 'Barrio Fino FC',
    awayTeam: 'Caleños United',
    homeInitials: 'BF',
    awayInitials: 'CU',
    date: 'Martes, 07:00 PM',
    startTime: '2026-04-08T00:00:00Z',
    league: 'Torneo Local',
    multipliers: { home: 1.75, draw: 3.60, away: 4.80 },
    pools: { home: 20000, draw: 6000, away: 4000 },
    isLive: false,
    status: 'OPEN',
  },
];

const LEADERBOARD_AVATARS = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAIlK0_Gc-rxzN6UyasLxEMYwsg8XoI85vAd1ffqn5Fb-unN8SnyXQBjbm6p3z_Wy3-0oQdXS6D88CSPezMey4cp2KtBl6ixY9wK5yPX44bqAowPKq-mZGK3ViqQe0AzKzOYQgZupG1rmoK3FTVFNse5LU00UWgdlvT7IZS9I_DVTSDe_wAh2KciEmmMWV3h9_O-05B3vPn04ZW9qyzFgte8UoEBHsD7IUPhNLoj1_0fKpxMlxYTTGG5V45vQwuA_MnbRnQU4VYm9w_',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD4pn1s2PUmPjGZk8KQY0HVhHfVX3ClFo8HN429On5iG5XdNdFyBHRTq6b_TLroB5a9qBTkxiDbLZDmgPHHzU7G3QxL3hErSHzI6U8Il2lKFyc-N0S9GwMPVjNgvrqG4VFBbJmu7yRTmRD6tic03IzDJw7Vqt30hU_p0SF9U2yJMDRjZYzvGWCocaf_Pc9ilsKz6rrAq-V0YqYFIwtEKqIVbhV3X9YEehxhUWwtrqYY9iIscxMLLolRlh7GJRWQIxOxPFBVzQO3Jthx',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCs1E6wP49RwRnJFe-pIf9eENs9ZQ56YTnCMWlzrDOtW78AeUdKdGEFxWTqhX8CdA6KD3b6T8mPua_rzD8MyE52vnbWIz2paP7-ZxrZJ7Vzh-t2ZuAc_IK6XWSNGgoJSOi-HKuogRSEcbnZlevk-4Y294KQ99AW-DH7W18tprG0g82wcb1f0HK3maJp5J7nZoOfGKBX5U2F3-QcbgjM7wZr64OyQ9gz3aFUrLUwoAR5CzEfKqtw_s26IRlIxHFOpaz2uxqntdgXeW3L',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC5YUndY3ALZrCEVp8_1D6XxyvKAkxzbFTx0KyrLmz8rxkciYOy973GEplj2Gmj_O9PN483v0-TPXr_AeoxOwOsx7X8EpwM6RNXh0HomTwby1V5XrEJE1GghayXSeT9zZn57oCWdaTRNqcY2dDYv8n_wI4FUT2-1n7DtKoQlGoik9Ywx2DIva59xIEjwEXGWenUHX17o0d9sOC66z53DeC1clTUstKu_YUNMO_MBpK5-57LOztE-IIM_HPtFUgLlkauJL7iaO_PZ8ZV',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC-ZjRZcJN7fp36ItrjQH2HWKFshmM1TUD2HwSKhV-G6rCu_BZnE1OM6xzxZxnIczvOaVM5loJddmfHKD3jBJoN3vEE4oY42jdbZP65dJXUICN4yb9hLb91Id7EBzAUTTYPIlsDm1oHT2oF3mVV6gxNfExoWCjkNnwrqesdpuImHhQ2auchItzY2VbHGxmb02ZTdSKl932Dl9TEgcr_Fj6Ik-zTHlXgkwmuebi1KzfIWOYzqy_FJfi829Y4r_BdJj_s5sUUyWFfbTip',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD6jhSaLgPgmULMnkMUa7YVLZN_LhO9Nbl5RSCTAD39vUGWWtH1ZM5VUOriDg6uVbikPln6uRFousduGTix5MlnoYuWyZsrhmQyj3nzebFQBYlF17Kdi_oxc5AmKXp7lkUiRQrrO2E0tTQWb9bEyQcG8h_fy0CqP0xbv0oz98Jw78qCD7ZAde58Cq4cCwbDOxuj1SgbUarqoofZh4mK4gVz_yLbySlRq3sLb69HaCiCM48_GIx9f9_XgLsz1eVxJ4yQaxZGRF_g3NUB',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDP4wedhdlrD7TY8Q3uDMeespru0mp8ZG-3jXeRruuPQRBBxOIbpEqpPZpTVEfOcltjxf1mRiPt_a-fq3I_axqVhJHY5ez2pwxYAB4YxnhbXefr4syDpFu6jM-keRUCXONt2fTVpv6xYoXmX49BYMshDFvFsTMESbZZrBMEG9Gz72g_9zabJu4oMLKEbzXuIPlxCHpn3VimWqsFHVlmulLBEsLEbMGDt1BX7iXW3OT_dPAgA4gkFAGn56lTYKDx-Q8gdTWutsAMb-xA',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCL_fk7iennB_V2t3WGbXWpdjykH5FlFlGieiXsAfkV3B_Bxu8Oh9KzbYxMYGGfIyM9eFCY5qbZYcUsbl-M4a5eQQ0US1a607NDrPhzRLr8TLJOA4vIBV5bztG_VJJemI9efE_lKV9UFOhdO8V-QYhACDGrWi_dDAeD69sWbtBc9TcgNa5PzBk8jtSgfQ2GXJlkmZxVYgjuC41WgMcY3xgDtnW1gWSeOJBfex6J6fR-bJEeqoMqFyndpBg0Qlz75ljqEGQYRib5HGQM',
];

const DEMO_LEADERBOARD: LeaderboardPlayer[] = [
  { rank: 1, name: 'StakeAlpha', points: 92400, avatar: LEADERBOARD_AVATARS[0] },
  { rank: 2, name: 'CryptoKing', points: 58100, avatar: LEADERBOARD_AVATARS[1] },
  { rank: 3, name: 'EtherQueen', points: 51900, avatar: LEADERBOARD_AVATARS[2] },
  { rank: 4, name: 'VitalikFan_99', points: 49820, avatar: LEADERBOARD_AVATARS[3] },
  { rank: 5, name: 'BullRunner', points: 48150, avatar: LEADERBOARD_AVATARS[4] },
  { rank: 6, name: 'DiamondHands', points: 47900, avatar: LEADERBOARD_AVATARS[5] },
  { rank: 7, name: 'SatoshiSpirit', points: 47230, avatar: LEADERBOARD_AVATARS[6] },
  { rank: 8, name: 'MoonShot', points: 46880, avatar: LEADERBOARD_AVATARS[7] },
];

// ─── Store Interface ────────────────────────

interface AppStore {
  // ─ User State ─
  balance: number;
  userName: string;
  tier: 'GUEST' | 'PREMIUM';
  xp: number;
  xpToNext: number;
  weeklyRecharges: number;
  lastRechargeWeek: number;

  // ─ Matches ─
  matches: DemoMatch[];
  activeFilter: string;
  setFilter: (filter: string) => void;
  getMatch: (id: string) => DemoMatch | undefined;

  // ─ Predictions ─
  predictions: DemoPrediction[];
  predictionFilter: string;
  setPredictionFilter: (filter: string) => void;
  submitPrediction: (matchId: string, prediction: PredictionType, amount: number) => boolean;
  earlyReturn: (predictionId: string) => boolean;
  topUp: (method: string) => boolean;
  canRecharge: (overrideBalance?: number) => { allowed: boolean; reason: string };

  // ─ TopUp Modal ─
  topUpModalOpen: boolean;
  openTopUpModal: () => void;
  closeTopUpModal: () => void;

  // ─ Redeem Code Modal (canje de código de cajero) ─
  redeemModalOpen: boolean;
  openRedeemModal: () => void;
  closeRedeemModal: () => void;

  // ─ Side Drawer ─
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;

  // ─ Info Modals ─
  rewardsModalOpen: boolean;
  openRewardsModal: () => void;
  closeRewardsModal: () => void;

  rulesModalOpen: boolean;
  openRulesModal: () => void;
  closeRulesModal: () => void;

  prizesModalOpen: boolean;
  openPrizesModal: () => void;
  closePrizesModal: () => void;

  playerProfileOpen: string | null;
  openPlayerProfile: (name: string) => void;
  closePlayerProfile: () => void;

  selectedTransaction: string | null;
  openTransactionDetail: (id: string) => void;
  closeTransactionDetail: () => void;

  // ─ Transactions ─
  transactions: Transaction[];

  // ─ Leaderboard ─
  leaderboard: LeaderboardPlayer[];
  myRank: number;

  // ─ Toasts ─
  toasts: Toast[];
  addToast: (type: Toast['type'], message: string) => void;
  removeToast: (id: string) => void;

  // ─ PredictionSlip ─
  predictionSlipOpen: boolean;
  predictionSlipSelection: {
    matchId: string;
    matchLabel: string;
    prediction: PredictionType;
    predictionLabel: string;
    multiplier: number;
  } | null;
  openPredictionSlip: (selection: NonNullable<AppStore['predictionSlipSelection']>) => void;
  closePredictionSlip: () => void;
}

// ─── Store Implementation ───────────────────

let toastCounter = 0;
let predictionCounter = 0;
let txCounter = 5;

export const useAppStore = create<AppStore>((set, get) => ({
  // ─ User ─
  balance: 10000,
  userName: 'Jugador Demo',
  tier: 'PREMIUM',
  xp: 7500,
  xpToNext: 10000,
  weeklyRecharges: 0,
  lastRechargeWeek: -1,

  // ─ Matches ─
  matches: DEMO_MATCHES,
  activeFilter: 'all',
  setFilter: (filter) => set({ activeFilter: filter }),
  getMatch: (id) => get().matches.find((m) => m.id === id),

  // ─ Predictions ─
  predictions: [],
  predictionFilter: 'All',
  setPredictionFilter: (filter) => set({ predictionFilter: filter }),

  submitPrediction: (matchId, prediction, amount) => {
    const state = get();
    const match = state.matches.find((m) => m.id === matchId);
    if (!match) {
      state.addToast('error', 'Partido no encontrado');
      return false;
    }
    if (amount <= 0) {
      state.addToast('error', 'El monto debe ser mayor a 0');
      return false;
    }
    if (amount > state.balance) {
      state.addToast('error', 'Saldo insuficiente');
      return false;
    }
    // §6 Rule 1: MAX STAKE
    if (amount > MAX_STAKE) {
      state.addToast('error', `Máximo ${MAX_STAKE.toLocaleString()} 🪙 por pronóstico`);
      return false;
    }
    if (match.status !== 'OPEN') {
      state.addToast('error', 'Este partido ya no acepta pronósticos');
      return false;
    }
    // §6 Rule 3: SINGLE PREDICTION
    const existingPrediction = state.predictions.find((b) => b.matchId === matchId && b.status === 'PENDING');
    if (existingPrediction) {
      state.addToast('error', 'Ya tienes una predicción activa en este partido');
      return false;
    }

    const predictionLabels: Record<PredictionType, string> = {
      HOME_WIN: `Gana ${match.homeTeam}`,
      DRAW: 'Empate',
      AWAY_WIN: `Gana ${match.awayTeam}`,
    };

    const multiplierValue = prediction === 'HOME_WIN' ? match.multipliers.home
      : prediction === 'DRAW' ? match.multipliers.draw
      : match.multipliers.away;

    predictionCounter++;
    const predictionId = `pred-${Date.now()}-${predictionCounter}`;
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }) + ' • ' + now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

    const newPrediction: DemoPrediction = {
      id: predictionId,
      matchId,
      match: `${match.homeTeam} vs ${match.awayTeam}`,
      league: `${match.league} • ${match.date}`,
      prediction,
      predictionLabel: predictionLabels[prediction],
      amount,
      multiplier: multiplierValue,
      estimatedReturn: Math.round(amount * multiplierValue * 100) / 100,
      status: 'PENDING',
      isLive: match.isLive,
      earlyReturn: match.isLive ? Math.round(amount * 0.85) : undefined,
      createdAt: now.toISOString(),
    };

    // Update pool
    const poolKey = prediction === 'HOME_WIN' ? 'home' : prediction === 'DRAW' ? 'draw' : 'away';
    const updatedMatches = state.matches.map((m) => {
      if (m.id === matchId) {
        const newPools = { ...m.pools, [poolKey]: m.pools[poolKey] + amount };
        const totalPool = newPools.home + newPools.draw + newPools.away;
        const netPool = totalPool * 0.8;
        return {
          ...m,
          pools: newPools,
          // §6 Rule 2: MAX MULTIPLIER CAP at 5.00
          multipliers: {
            home: Math.min(MAX_MULTIPLIER_CAP, Math.max(1.05, Math.round((netPool / newPools.home) * 100) / 100)),
            draw: Math.min(MAX_MULTIPLIER_CAP, Math.max(1.05, Math.round((netPool / newPools.draw) * 100) / 100)),
            away: Math.min(MAX_MULTIPLIER_CAP, Math.max(1.05, Math.round((netPool / newPools.away) * 100) / 100)),
          },
        };
      }
      return m;
    });

    txCounter++;
    const newTx: Transaction = {
      id: `tx-${txCounter}`,
      type: 'debit',
      label: `Pronóstico: ${predictionLabels[prediction]}`,
      date: dateStr,
      amount: -amount,
      amountLabel: `-${amount.toLocaleString()} PyP`,
      icon: 'sports_soccer',
      category: 'prediction_submit',
    };

    set({
      balance: state.balance - amount,
      predictions: [newPrediction, ...state.predictions],
      matches: updatedMatches,
      transactions: [newTx, ...state.transactions],
      predictionSlipOpen: false,
      predictionSlipSelection: null,
    });

    state.addToast('success', `Pronóstico de ${amount.toLocaleString()} PyP registrado exitosamente`);
    return true;
  },

  earlyReturn: (predictionId) => {
    const state = get();
    const pred = state.predictions.find((b) => b.id === predictionId);
    if (!pred || pred.status !== 'PENDING' || !pred.earlyReturn) {
      state.addToast('error', 'No se puede retirar este pronóstico');
      return false;
    }

    const returnAmount = pred.earlyReturn;
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }) + ' • ' + now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

    txCounter++;
    const tx: Transaction = {
      id: `tx-${txCounter}`,
      type: 'credit',
      label: `Retiro Anticipado: ${pred.match}`,
      date: dateStr,
      amount: returnAmount,
      amountLabel: `+${returnAmount.toLocaleString()} PyP`,
      icon: 'account_balance_wallet',
      category: 'early_return',
    };

    set({
      balance: state.balance + returnAmount,
      predictions: state.predictions.map((b) =>
        b.id === predictionId ? { ...b, status: 'WON' as const, estimatedReturn: returnAmount, earlyReturn: undefined } : b
      ),
      transactions: [tx, ...state.transactions],
    });

    state.addToast('success', `Retiro Anticipado exitoso: +${returnAmount.toLocaleString()} PyP`);
    return true;
  },

  // ─ Transactions ─
  transactions: [
    { id: 'tx-1', type: 'credit', label: 'Bono de Bienvenida', date: 'Mar 30 • 14:20', amount: 10000, amountLabel: '+10,000 PyP', icon: 'redeem', category: 'bonus' },
    { id: 'tx-2', type: 'credit', label: 'Racha Diaria de Inicio', date: 'Mar 29 • 00:05', amount: 100, amountLabel: '+100 PyP', icon: 'celebration', category: 'bonus' },
    { id: 'tx-3', type: 'credit', label: 'Racha de 3 Aciertos', date: 'Mar 28 • 22:45', amount: 500, amountLabel: '+500 PyP', icon: 'emoji_events', category: 'bonus' },
  ],

  // ─ Leaderboard ─
  leaderboard: DEMO_LEADERBOARD,
  myRank: 12,

  // ─ Toasts ─
  toasts: [],
  addToast: (type, message) => {
    toastCounter++;
    const id = `toast-${toastCounter}`;
    set((state) => ({
      toasts: [...state.toasts, { id, type, message, createdAt: Date.now() }],
    }));
    // Auto remove after 4 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);
  },
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),

  // ─ PredictionSlip ─
  predictionSlipOpen: false,
  predictionSlipSelection: null,
  openPredictionSlip: (selection) => set({ predictionSlipOpen: true, predictionSlipSelection: selection }),
  closePredictionSlip: () => set({ predictionSlipOpen: false, predictionSlipSelection: null }),

  // ─ Side Drawer ─
  drawerOpen: false,
  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),

  // ─ Info Modals ─
  rewardsModalOpen: false,
  openRewardsModal: () => set({ rewardsModalOpen: true }),
  closeRewardsModal: () => set({ rewardsModalOpen: false }),

  rulesModalOpen: false,
  openRulesModal: () => set({ rulesModalOpen: true }),
  closeRulesModal: () => set({ rulesModalOpen: false }),

  prizesModalOpen: false,
  openPrizesModal: () => set({ prizesModalOpen: true }),
  closePrizesModal: () => set({ prizesModalOpen: false }),

  playerProfileOpen: null,
  openPlayerProfile: (name) => set({ playerProfileOpen: name }),
  closePlayerProfile: () => set({ playerProfileOpen: null }),

  selectedTransaction: null,
  openTransactionDetail: (id) => set({ selectedTransaction: id }),
  closeTransactionDetail: () => set({ selectedTransaction: null }),

  // ─ TopUp ─
  topUpModalOpen: false,
  openTopUpModal: () => set({ topUpModalOpen: true }),
  closeTopUpModal: () => set({ topUpModalOpen: false }),

  // ─ Redeem Code (canje de código de cajero) ─
  redeemModalOpen: false,
  openRedeemModal: () => set({ redeemModalOpen: true }),
  closeRedeemModal: () => set({ redeemModalOpen: false }),

  topUp: (method) => {
    const state = get();

    // §6 Bankruptcy Rule: balance must be < 2000
    if (state.balance >= RECHARGE_MIN_BALANCE) {
      state.addToast('error', `Solo puedes recargar cuando tu saldo sea menor a ${RECHARGE_MIN_BALANCE.toLocaleString()} 🪙`);
      return false;
    }

    // §6 Weekly Cap
    const currentWeek = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    const rechargesThisWeek = state.lastRechargeWeek === currentWeek ? state.weeklyRecharges : 0;
    if (rechargesThisWeek >= RECHARGE_WEEKLY_CAP) {
      state.addToast('error', `Ya usaste tus ${RECHARGE_WEEKLY_CAP} recargas de esta semana`);
      return false;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }) + ' • ' + now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

    txCounter++;
    const tx: Transaction = {
      id: `tx-${txCounter}`,
      type: 'credit',
      label: `Recarga vía ${method}`,
      date: dateStr,
      amount: RECHARGE_COINS,
      amountLabel: `+${RECHARGE_COINS.toLocaleString()} PyP`,
      icon: 'account_balance_wallet',
      category: 'topup',
    };

    const newXp = Math.min(state.xp + Math.floor(RECHARGE_COINS * 0.1), state.xpToNext);

    set({
      balance: state.balance + RECHARGE_COINS,
      transactions: [tx, ...state.transactions],
      xp: newXp,
      topUpModalOpen: false,
      weeklyRecharges: rechargesThisWeek + 1,
      lastRechargeWeek: currentWeek,
    });

    state.addToast('success', `+${RECHARGE_COINS.toLocaleString()} 🪙 PyP Coins recargados exitosamente`);
    return true;
  },

  canRecharge: (overrideBalance?: number) => {
    const state = get();
    const effectiveBalance = overrideBalance !== undefined ? overrideBalance : state.balance;
    if (effectiveBalance >= RECHARGE_MIN_BALANCE) {
      return { allowed: false, reason: `Tu saldo actual (${effectiveBalance.toLocaleString()} 🪙) es mayor a ${RECHARGE_MIN_BALANCE.toLocaleString()}. Solo puedes recargar cuando tu saldo sea menor.` };
    }
    const currentWeek = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    const rechargesThisWeek = state.lastRechargeWeek === currentWeek ? state.weeklyRecharges : 0;
    if (rechargesThisWeek >= RECHARGE_WEEKLY_CAP) {
      return { allowed: false, reason: `Ya usaste tus ${RECHARGE_WEEKLY_CAP} recargas permitidas esta semana. Intenta el lunes.` };
    }
    return { allowed: true, reason: '' };
  },
}));
