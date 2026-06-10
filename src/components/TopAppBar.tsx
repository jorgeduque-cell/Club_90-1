// ============================================
// CLUB PYP — TopAppBar (Connected to Store)
// ============================================

import { useState } from 'react';
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
  const [logoOk, setLogoOk] = useState(true);

  return (
    <header className="bg-[#1c1610] flex justify-between items-center w-full px-3 py-3 h-16 sticky top-0 z-40">
      <div className="flex items-center gap-2">
        {showBack ? (
          <button
            onClick={() => navigate(-1)}
            className="text-[#e5b85c] hover:bg-[#2e2418] transition-colors p-1 active:scale-95 duration-150 rounded-lg"
            aria-label="Volver"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        ) : (
          <button onClick={openDrawer} className="text-white hover:bg-[#2e2418] transition-colors p-1 rounded-lg" aria-label="Menú">
            <span className="material-symbols-outlined">menu</span>
          </button>
        )}
        {title && !isHome ? (
          <h1
            className="font-extrabold tracking-tighter uppercase text-xl text-white cursor-pointer select-none"
            onClick={() => navigate('/')}
          >
            {title}
          </h1>
        ) : logoOk ? (
          <img
            src="/logo.png"
            alt="Club PyP"
            onClick={() => navigate('/')}
            onError={() => setLogoOk(false)}
            className="h-10 cursor-pointer select-none object-contain"
          />
        ) : (
          <h1
            className="font-black tracking-tighter uppercase text-xl text-[#e5b85c] italic cursor-pointer select-none"
            onClick={() => navigate('/')}
          >
            CLUB PyP
          </h1>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/profile')}
          className="text-white bg-[#3a2d1c] rounded-l-full px-4 py-1.5 flex items-center gap-2 text-sm font-bold hover:bg-[#4a3d28] transition-colors active:scale-95"
          aria-label="Ver balance"
        >
          <span className="tabular-nums">{balance.toLocaleString()}</span>
          <span className="text-[10px] text-[#b8a98a] font-bold">PyP</span>
        </button>
        <button
          onClick={openRedeemModal}
          className="bg-[#e5b85c] text-[#2a1c00] rounded-r-full px-2.5 py-1.5 flex items-center justify-center hover:bg-[#f2d27a] transition-colors active:scale-95"
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
