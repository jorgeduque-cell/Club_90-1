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
  const openDrawer = useAppStore((s) => s.openDrawer);
  const live = useIsLive();
  const { profile } = useAuth();
  const balance = live && profile ? profile.clCoins : demoBalance;
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [logoOk, setLogoOk] = useState(true);

  return (
    <header className="bg-[#1f1e1c] flex justify-between items-center w-full px-3 py-3 h-16 sticky top-0 z-40">
      <div className="flex items-center gap-2">
        {showBack ? (
          <button
            onClick={() => navigate(-1)}
            className="text-[#e5b85c] hover:bg-[#2e2c29] transition-colors p-1 active:scale-95 duration-150 rounded-lg"
            aria-label="Volver"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        ) : (
          <button onClick={openDrawer} className="text-white hover:bg-[#2e2c29] transition-colors p-1 rounded-lg" aria-label="Menú">
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
            src="/logo_completo_sin_fondo.png"
            alt="Club PyP — Pachanga y Pochola"
            onClick={() => navigate('/')}
            onError={() => setLogoOk(false)}
            className="h-12 cursor-pointer select-none object-contain"
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
      <button
        onClick={() => navigate('/profile')}
        className="text-white bg-[#393633] rounded-full px-4 py-1.5 flex items-center gap-2 text-sm font-bold hover:bg-[#4a4641] transition-colors active:scale-95"
        aria-label="Ver balance"
      >
        <span className="tabular-nums text-[#e5b85c]">{balance.toLocaleString()}</span>
        <span className="text-[10px] text-[#b8a98a] font-bold uppercase">PyP Coins</span>
      </button>
    </header>
  );
}
