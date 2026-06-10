// ============================================
// CLUB PYP — Side Drawer (Menú Hamburguesa)
// ============================================

import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

const NAV_ITEMS = [
  { icon: 'home', label: 'Inicio', path: '/' },
  { icon: 'confirmation_number', label: 'Mis Pronósticos', path: '/bets' },
  { icon: 'leaderboard', label: 'Ranking', path: '/leaderboard' },
  { icon: 'person', label: 'Mi Perfil', path: '/profile' },
];

const ACTION_ITEMS = [
  { icon: 'redeem', label: 'Recompensas', action: 'rewards' },
  { icon: 'menu_book', label: 'Reglas del Juego', action: 'rules' },
  { icon: 'emoji_events', label: 'Premios', action: 'prizes' },
];

export default function SideDrawer() {
  const navigate = useNavigate();
  const location = useLocation();
  const drawerOpen = useAppStore((s) => s.drawerOpen);
  const closeDrawer = useAppStore((s) => s.closeDrawer);
  const openRewardsModal = useAppStore((s) => s.openRewardsModal);
  const openRulesModal = useAppStore((s) => s.openRulesModal);
  const openPrizesModal = useAppStore((s) => s.openPrizesModal);
  const openRedeemModal = useAppStore((s) => s.openRedeemModal);
  const demoBalance = useAppStore((s) => s.balance);
  const demoUserName = useAppStore((s) => s.userName);
  const demoTier = useAppStore((s) => s.tier);

  // Use real data when available
  const { profile } = useAuth();
  const live = isSupabaseConfigured && !!profile?.id && profile.id !== 'demo-user-001';
  const balance = live ? profile!.clCoins : demoBalance;
  const userName = live ? (profile!.name || 'Jugador') : demoUserName;
  const tier = live ? (profile?.accountTier || 'GUEST') : demoTier;

  if (!drawerOpen) return null;

  function handleNavigation(path: string) {
    closeDrawer();
    navigate(path);
  }

  function handleAction(action: string) {
    closeDrawer();
    if (action === 'rewards') openRewardsModal();
    else if (action === 'rules') openRulesModal();
    else if (action === 'prizes') openPrizesModal();
  }

  function handleRedeem() {
    closeDrawer();
    openRedeemModal();
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-[80] backdrop-blur-sm" onClick={closeDrawer} />

      {/* Drawer */}
      <div className="fixed left-0 top-0 bottom-0 w-72 bg-[#140f0a] z-[85] shadow-2xl animate-[slideRight_0.25s_ease-out] overflow-y-auto">
        {/* Header */}
        <div className="bg-[#1c1610] p-5 pb-6 border-b border-[#2e2418]">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Club PyP</h2>
            <button onClick={closeDrawer} className="text-[#c2b391] hover:text-white transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-[#2e2418] rounded-full flex items-center justify-center border-2 border-[#d72a22]">
              <span className="text-lg font-black text-[#efe6d2]">{userName.charAt(0)}</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm">{userName}</p>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[#f0d9a8] text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                <span className="text-[#f0d9a8] text-[10px] font-bold uppercase tracking-wider">{tier}</span>
              </div>
            </div>
          </div>
          <div className="bg-[#140f0a] rounded-lg p-3 flex justify-between items-center">
            <div>
              <p className="text-[9px] text-[#c2b391] font-bold uppercase tracking-widest">Balance</p>
              <p className="text-[#e5b85c] font-black text-lg tabular-nums">{balance.toLocaleString()} 🪙</p>
            </div>
            <button
              onClick={handleRedeem}
              className="bg-[#e5b85c] text-[#2a1c00] px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider active:scale-95"
            >
              Canjear
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#c2b391] px-3 mb-2">Navegación</p>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-bold transition-all active:scale-[0.98] ${
                location.pathname === item.path
                  ? 'bg-[#d72a22]/15 text-[#f0d9a8]'
                  : 'text-[#efe6d2] hover:bg-[#1c1610]'
              }`}
            >
              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: location.pathname === item.path ? "'FILL' 1" : undefined }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
          {(profile?.role === 'CASHIER' || profile?.role === 'ADMIN') && (
            <button
              onClick={() => handleNavigation('/cashier')}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-bold transition-all active:scale-[0.98] ${
                location.pathname === '/cashier' ? 'bg-[#d72a22]/15 text-[#f0d9a8]' : 'text-[#efe6d2] hover:bg-[#1c1610]'
              }`}
            >
              <span className="material-symbols-outlined text-lg">point_of_sale</span>
              Caja
            </button>
          )}
        </nav>

        <div className="mx-3 h-px bg-[#2e2418]" />

        {/* Actions */}
        <div className="p-3 space-y-1">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#c2b391] px-3 mb-2">Club PyP</p>
          {ACTION_ITEMS.map((item) => (
            <button
              key={item.action}
              onClick={() => handleAction(item.action)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-bold text-[#efe6d2] hover:bg-[#1c1610] transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        <div className="mx-3 h-px bg-[#2e2418]" />

        {/* Admin */}
        <div className="p-3 space-y-1">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#ffb4ab] px-3 mb-2">Admin</p>
          <button
            onClick={() => { closeDrawer(); navigate('/admin/teams'); }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-bold text-[#efe6d2] hover:bg-[#1c1610] transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-lg">shield_person</span>
            Equipos & Nóminas
          </button>
        </div>

        {/* Footer */}
        <div className="mt-auto p-4 border-t border-[#2e2418]">
          <p className="text-[#c2b391] text-[9px] text-center opacity-50">
            Club PyP © 2026 — Juego de Fantasía
          </p>
        </div>
      </div>
    </>
  );
}
