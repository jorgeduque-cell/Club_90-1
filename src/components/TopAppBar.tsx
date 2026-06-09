// ============================================
// CLUB 90 — TopAppBar (Connected to Store)
// ============================================

import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';
import { useIsLive } from '../hooks/useSupabaseData';
import { useAuth } from '../context/AuthContext';

interface TopAppBarProps {
  title?: string;
  showBack?: boolean;
}

export default function TopAppBar({ title, showBack = false }: TopAppBarProps) {
  const demoBalance = useAppStore((s) => s.balance);
  const openRedeemModal = useAppStore((s) => s.openRedeemModal);
  const openDrawer = useAppStore((s) => s.openDrawer);
  const live = useIsLive();
  const { profile } = useAuth();
  const balance = live && profile ? profile.clCoins : demoBalance;
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <header className="bg-[#1a2c39] flex justify-between items-center w-full px-3 py-3 h-16 sticky top-0 z-40">
      <div className="flex items-center gap-2">
        {showBack ? (
          <button
            onClick={() => navigate(-1)}
            className="text-[#00e601] hover:bg-[#253744] transition-colors p-1 active:scale-95 duration-150 rounded-lg"
            aria-label="Volver"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        ) : (
          <button onClick={openDrawer} className="text-white hover:bg-[#253744] transition-colors p-1 rounded-lg" aria-label="Menú">
            <span className="material-symbols-outlined">menu</span>
          </button>
        )}
        <h1
          className="font-extrabold tracking-tighter uppercase text-xl text-white cursor-pointer select-none"
          onClick={() => navigate('/')}
        >
          {title && !isHome ? title : 'CLUB 90+1'}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/profile')}
          className="text-white bg-[#2f4553] rounded-l-full px-4 py-1.5 flex items-center gap-2 text-sm font-bold hover:bg-[#3d5a6d] transition-colors active:scale-95"
          aria-label="Ver balance"
        >
          <span className="tabular-nums">{balance.toLocaleString()}</span>
          <span className="text-[10px] text-[#b1bad3] font-bold">CL</span>
        </button>
        <button
          onClick={openRedeemModal}
          className="bg-[#00e601] text-[#013a00] rounded-r-full px-2.5 py-1.5 flex items-center justify-center hover:bg-[#33ff33] transition-colors active:scale-95"
          aria-label="Canjear código"
        >
          <span className="material-symbols-outlined text-lg font-bold" style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}>
            add
          </span>
        </button>
      </div>
    </header>
  );
}
