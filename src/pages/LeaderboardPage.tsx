// ============================================
// CLUB PYP — Leaderboard Dual & Wall of Shame
// ============================================

import { useMemo, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { useLeaderboard, useIsLive } from '../hooks/useSupabaseData';
import { useAuth } from '../context/AuthContext';

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<'SEMANAL' | 'GLOBAL'>('SEMANAL');

  const demoLeaderboard = useAppStore((s) => s.leaderboard);
  const demoMyRank = useAppStore((s) => s.myRank);
  const demoBalance = useAppStore((s) => s.balance);
  const demoUserName = useAppStore((s) => s.userName);
  const openPlayerProfile = useAppStore((s) => s.openPlayerProfile);
  const playerProfileOpen = useAppStore((s) => s.playerProfileOpen);
  const closePlayerProfile = useAppStore((s) => s.closePlayerProfile);

  const live = useIsLive();
  const { profile } = useAuth();
  
  // Solicitamos mayor límite temporal para cazar algunos "isBankrupt"
  const { players: supaPlayers, myRank: supaMyRank } = useLeaderboard(100);

  // Normalize to unified shape
  const allPlayers = useMemo(() => {
    if (live) {
      return supaPlayers.map((p: any, i: number) => ({
        id: p.id,
        rank: i + 1,
        name: p.name || 'Jugador',
        points: p.cl_coins || p.clCoins || 0,
        winRate: p.win_rate || p.winRate || 0,
        streak: p.current_streak || p.currentStreak || Math.floor(Math.random() * 5), // provisorio si no viene
        isBankrupt: p.is_bankrupt || p.isBankrupt || false,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.name || 'U')}&backgroundColor=1a2c39&textColor=ffffff`,
      }));
    }
    // Demo Mock if not live: add a fake bankrupt user for UI showcase
    return [
      ...demoLeaderboard,
      { rank: 99, name: 'Lucho M.', points: 0, winRate: 10, streak: 0, isBankrupt: true, avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=LM&backgroundColor=1a2c39&textColor=ffffff'}
    ];
  }, [live, supaPlayers, demoLeaderboard]);

  const activePlayers = useMemo(() => {
    let list = allPlayers.filter(p => !p.isBankrupt);
    if (activeTab === 'SEMANAL') {
      // Orden por racha (mock visual de dinamismo)
      list = [...list].sort((a, b) => (b.streak || 0) - (a.streak || 0));
      // Reasignamos rangos visuales
      list = list.map((p, idx) => ({ ...p, rank: idx + 1 }));
    } else {
      list = [...list].sort((a, b) => b.points - a.points);
      list = list.map((p, idx) => ({ ...p, rank: idx + 1 }));
    }
    return list;
  }, [allPlayers, activeTab]);

  const bankruptPlayers = useMemo(() => allPlayers.filter(p => p.isBankrupt), [allPlayers]);

  const myRank = live && activeTab === 'GLOBAL' ? supaMyRank : demoMyRank; // Aproximado
  const balance = live && profile ? profile.clCoins : demoBalance;
  const userName = live && profile ? (profile.name || 'Jugador') : demoUserName;

  const podium = useMemo(() => {
    const top3 = activePlayers.slice(0, 3);
    if (top3.length === 0) return [];
    if (top3.length === 1) return [null, top3[0], null];
    if (top3.length === 2) return [top3[1], top3[0], null];
    return [top3[1], top3[0], top3[2]];
  }, [activePlayers]);

  const list = useMemo(() => activePlayers.slice(3), [activePlayers]);

  const medals = ['🥈', '🥇', '🥉'];
  const medalColors = ['#C0C0C0', '#FFD700', '#CD7F32'];

  const selectedPlayer = useMemo(() => {
    if (!playerProfileOpen) return null;
    return allPlayers.find((p) => p.name === playerProfileOpen) || null;
  }, [playerProfileOpen, allPlayers]);

  return (
    <main className="pt-4 pb-24 px-4 max-w-lg mx-auto min-h-screen">
      {/* Header & Tabs */}
      <div className="mb-6 flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase leading-none">Ranking VIP</h1>
          <p className="text-[#c2b391] text-sm font-medium">Compite en la cima del Club PyP</p>
        </div>

        <div className="flex bg-[#1f1e1c] rounded-xl p-1 shadow-inner relative">
          <button 
            onClick={() => setActiveTab('SEMANAL')}
            className={`flex-1 py-2 font-black text-xs uppercase tracking-widest rounded-lg transition-all z-10 ${activeTab === 'SEMANAL' ? 'text-[#2a1c00] shadow-md' : 'text-[#7d776e] hover:text-white'}`}
          >
            Semanal 🔥
          </button>
          <button 
            onClick={() => setActiveTab('GLOBAL')}
            className={`flex-1 py-2 font-black text-xs uppercase tracking-widest rounded-lg transition-all z-10 ${activeTab === 'GLOBAL' ? 'text-[#2a1c00] shadow-md' : 'text-[#7d776e] hover:text-white'}`}
          >
            Global 🌎
          </button>
          
          <div 
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#e5b85c] rounded-lg transition-transform duration-300 ease-in-out shadow-[0_0_10px_rgba(215,42,34,0.5)]"
            style={{ 
              transform: activeTab === 'SEMANAL' ? 'translateX(0)' : 'translateX(calc(100% + 4px))'
            }}
          />
        </div>
      </div>

      {/* Racha Semanal Banner */}
      {activeTab === 'SEMANAL' && (
        <div className="bg-gradient-to-r from-[#ff6b00] to-[#ff0055] rounded-xl p-3 mb-6 flex justify-between items-center shadow-[0_4px_20px_rgba(255,107,0,0.3)]">
          <span className="text-white font-black italic text-sm tracking-wider uppercase">Reto de Rachas Activo</span>
          <span className="bg-black/30 px-2 py-1 rounded text-white text-[10px] font-bold">Termina en 2d 14h</span>
        </div>
      )}

      {/* Profiler Propio */}
      <div className="mb-8 relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#e5b85c] to-[#ffd700] rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000" />
        <div className="relative bg-[#1f1e1c] rounded-xl p-5 flex items-center justify-between border border-[#e5b85c]/20 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-[#e5b85c] uppercase tracking-widest">Posición</span>
              <span className="text-3xl font-black text-white italic tracking-tighter tabular-nums">#{myRank}</span>
            </div>
            <div className="h-10 w-px bg-[#4c4843]/20 mx-1" />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-[#e5b85c] bg-[#2e2c29] flex items-center justify-center text-lg font-black">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-base leading-tight">{userName}</span>
                <span className="text-[#c2b391] text-[10px] font-semibold uppercase tracking-wider">{profile?.accountTier || 'GUEST'}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[#e5b85c] font-black text-xl tracking-tighter leading-none tabular-nums">{balance.toLocaleString()}</div>
            <div className="text-[#c2b391] text-[9px] font-bold uppercase tracking-widest">PyP Coins</div>
          </div>
        </div>
      </div>

      {/* Podium */}
      <div className="grid grid-cols-3 gap-3 mb-8 items-end">
        {podium.map((player, idx) => {
          const isFirst = idx === 1;
          if (!player) return <div key={`empty-${idx}`} className={`${isFirst ? 'pb-6' : 'pb-5'}`} />;
          return (
            <button
              key={player.rank}
              onClick={() => openPlayerProfile(player.name)}
              className={`flex flex-col items-center relative active:scale-95 transition-transform ${
                isFirst
                  ? 'bg-[#1f1e1c] p-4 rounded-xl pb-6 border-t border-[#e5b85c]/30 shadow-2xl'
                  : 'bg-[#181817] p-3 rounded-xl pb-5'
              }`}
            >
              <div
                className={`absolute -top-4 rounded-full flex items-center justify-center text-white font-black shadow-lg z-10 ${
                  isFirst ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs'
                }`}
                style={{
                  backgroundColor: medalColors[idx],
                  boxShadow: isFirst ? `0 0 15px ${medalColors[idx]}55` : undefined,
                }}
              >
                {medals[idx]}
              </div>
              <div
                className={`rounded-full overflow-hidden mb-2 ${
                  isFirst ? 'w-16 h-16 border-4' : 'w-12 h-12 border-2'
                }`}
                style={{ borderColor: `${medalColors[idx]}80` }}
              >
                <img alt={player.name} className="w-full h-full object-cover" src={player.avatar} />
              </div>
              <span className={`text-white font-bold w-full text-center truncate ${isFirst ? 'text-xs font-black' : 'text-[10px]'}`}>
                {player.name}
              </span>
              <span className={`text-[#e5b85c] font-black tabular-nums mt-1 ${isFirst ? 'text-sm' : 'text-xs'}`}>
                {activeTab === 'SEMANAL' ? `🔥 ${player.streak || 0}` : `${player.points.toLocaleString()}`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Leaderboard List */}
      <div className="bg-[#181817] rounded-xl overflow-hidden mb-8 shadow-inner">
        <div className="px-4 py-3 bg-[#1f1e1c]/80 flex justify-between text-[10px] font-black uppercase tracking-[0.15em] text-[#c2b391] border-b border-[#2e2c29]">
          <span>Rank & Jugador</span>
          <span>{activeTab === 'SEMANAL' ? '🔥 Racha' : '🪙 PyP Coins'}</span>
        </div>
        <div className="divide-y divide-[#4c4843]/20">
          {list.map((player) => (
            <button
              key={player.rank}
              onClick={() => openPlayerProfile(player.name)}
              className="w-full flex items-center justify-between p-4 hover:bg-[#1f1e1c] transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className="w-6 text-[#7d776e] font-black italic tracking-tighter text-sm tabular-nums">#{player.rank}</span>
                <div className="flex items-center gap-3">
                  <img alt={player.name} className="w-9 h-9 rounded-lg object-cover bg-[#171716]" src={player.avatar} />
                  <span className="text-white font-bold text-sm">{player.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#e5b85c] font-black tracking-tight tabular-nums">
                  {activeTab === 'SEMANAL' ? player.streak : player.points.toLocaleString()}
                </span>
              </div>
            </button>
          ))}
          {list.length === 0 && (
            <div className="text-center p-6 text-[#7d776e] text-xs font-bold uppercase tracking-wider">
              No hay más jugadores activos.
            </div>
          )}
        </div>
      </div>

      {/* Wall of Shame (💀) */}
      <div className="border border-[#720000] bg-[#1a0000] rounded-xl overflow-hidden shadow-[0_0_20px_rgba(255,0,0,0.15)] opacity-90">
        <div className="px-4 py-3 bg-[#3a0000] flex justify-between items-center border-b border-[#720000]">
          <div className="flex items-center gap-2">
            <span className="text-xl">💀</span>
            <span className="text-[#ff4444] text-[10px] font-black uppercase tracking-[0.2em]">Wall of Shame</span>
          </div>
          <span className="text-[#888] text-[9px] uppercase tracking-widest border border-[#720000] px-2 py-0.5 rounded text-red-500">Bankrupt</span>
        </div>
        <div className="divide-y divide-[#3a0000]">
          {bankruptPlayers.map((bp) => (
            <div key={bp.id || bp.name} className="w-full flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <span className="w-6 text-[#550000] font-black italic tracking-tighter text-sm line-through">#{bp.rank}</span>
                <div className="flex items-center gap-3 opacity-60 grayscale">
                  <img alt={bp.name} className="w-9 h-9 rounded-lg object-cover" src={bp.avatar} />
                  <span className="text-[#cc4444] font-bold text-sm line-through decoration-[#d72a22]">{bp.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#d72a22] font-black tracking-tight tabular-nums">0 PyP</span>
              </div>
            </div>
          ))}
          {bankruptPlayers.length === 0 && (
            <div className="p-5 text-center text-[#ff4444] opacity-50 text-xs italic">
              Nadie ha quebrado recientemente... aún.
            </div>
          )}
        </div>
      </div>

      {/* Profiler Modal */}
      {selectedPlayer && (
        <>
          <div className="fixed inset-0 bg-[#171716]/90 z-[90] backdrop-blur-md" onClick={closePlayerProfile} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[95] max-w-sm mx-auto">
            <div className="bg-gradient-to-b from-[#1f1e1c] to-[#171716] rounded-3xl p-6 shadow-2xl border border-[rgba(255,255,255,0.05)]">
              <button onClick={closePlayerProfile} className="absolute top-4 right-4 text-[#7d776e] hover:text-white bg-black/20 rounded-full w-8 h-8 flex items-center justify-center">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>

              <div className="flex flex-col items-center text-center mt-2">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#e5b85c] mb-4 shadow-[0_0_20px_rgba(215,42,34,0.2)]">
                  <img alt={selectedPlayer.name} className="w-full h-full object-cover" src={selectedPlayer.avatar} />
                </div>
                <h3 className="text-white font-black text-2xl uppercase tracking-tighter mb-1">{selectedPlayer.name}</h3>
                
                {selectedPlayer.isBankrupt ? (
                  <span className="bg-[#d72a22] text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded shadow-lg mt-1 rounded-full">
                    ESTADO: BANCARROTA
                  </span>
                ) : (
                  <span className="text-[#e5b85c] text-[10px] font-bold uppercase tracking-widest bg-[#e5b85c]/10 px-3 py-1 rounded-full border border-[#e5b85c]/20">
                    Rango #{selectedPlayer.rank} Global
                  </span>
                )}

                <div className="w-full grid grid-cols-2 gap-3 mt-6">
                  <div className="bg-[#181817] rounded-xl p-3 text-center border border-[#1f1e1c]">
                    <p className="text-[9px] text-[#7d776e] font-black uppercase tracking-widest mb-1">Caja Fuerte</p>
                    <p className={`font-black text-xl tabular-nums ${selectedPlayer.isBankrupt ? 'text-[#d72a22]' : 'text-[#e5b85c]'}`}>
                      {selectedPlayer.points.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-[#181817] rounded-xl p-3 text-center border border-[#1f1e1c]">
                    <p className="text-[9px] text-[#7d776e] font-black uppercase tracking-widest mb-1">Racha Actual</p>
                    <p className="text-[#ffd700] font-black text-xl tabular-nums">🔥 {selectedPlayer.streak || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
