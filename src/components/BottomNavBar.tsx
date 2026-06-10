// ============================================
// CLUB PYP — BottomNavBar (Stitch Design)
// ============================================

import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { id: 'home', path: '/', icon: 'home', label: 'Partidos', fill: true },
  { id: 'bets', path: '/bets', icon: 'receipt_long', label: 'Pronósticos', fill: false },
  { id: 'store', path: '/store', icon: 'storefront', label: 'Kiosco', fill: false },
  { id: 'leaderboard', path: '/leaderboard', icon: 'leaderboard', label: 'Ranking', fill: false },
  { id: 'profile', path: '/profile', icon: 'person', label: 'Perfil', fill: false },
];

export default function BottomNavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-16 pb-safe bg-[#1f1e1c] border-t border-[#2e2c29]/30 shadow-[0_-4px_12px_rgba(0,0,0,0.4)]">
      {tabs.map((tab) => {
        const isActive = tab.path === '/'
          ? currentPath === '/' || currentPath.startsWith('/match/')
          : currentPath === tab.path;

        return (
          <button
            key={tab.id}
            id={`nav-${tab.id}`}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center justify-center pt-1 w-full h-full transition-all active:opacity-80 ${
              isActive
                ? 'text-[#e5b85c] border-t-2 border-[#e5b85c]'
                : 'text-[#b8a98a] pt-1.5 hover:text-white'
            }`}
          >
            <span
              className="material-symbols-outlined text-[24px]"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {tab.icon}
            </span>
            <span className="text-[10px] font-bold uppercase mt-0.5">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
