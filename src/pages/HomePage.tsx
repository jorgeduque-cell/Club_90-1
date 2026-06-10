// ============================================
// CLUB PYP — HomePage (Fully Functional)
// ============================================

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, PredictionType } from '../stores/appStore';
import { useMatchMarkets, useIsLive } from '../hooks/useSupabaseData';

const FILTERS = [
  { id: 'all', icon: 'sports_soccer', label: 'Todos' },
  { id: 'kings', icon: 'emoji_events', label: 'Kings League' },
  { id: 'local', icon: 'stadium', label: 'Torneo Local' },
  { id: 'live', icon: 'sensors', label: 'En Vivo' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const live = useIsLive();
  const demoMatches = useAppStore((s) => s.matches);
  const openPredictionSlip = useAppStore((s) => s.openPredictionSlip);
  const predictionSlipSelection = useAppStore((s) => s.predictionSlipSelection);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Supabase data (only loads when live)
  const { matches: supaMatches, loading: supaLoading } = useMatchMarkets();

  // Normalize matches to a unified shape
  const normalizedMatches = useMemo(() => {
    if (live) {
      return supaMatches.map((m: any) => {
        const now = new Date();
        const start = new Date(m.startTime);
        const isLive = m.status === 'OPEN' && start <= now;
        const minute = isLive ? Math.min(90, Math.floor((now.getTime() - start.getTime()) / 60000)) : undefined;
        const homeName = m.home_team?.name || 'Local';
        const awayName = m.away_team?.name || 'Visitante';

        return {
          id: m.id,
          homeTeam: homeName,
          awayTeam: awayName,
          homeInitials: homeName.slice(0, 3).toUpperCase(),
          awayInitials: awayName.slice(0, 3).toUpperCase(),
          date: start.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }),
          startTime: start.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
          league: 'Torneo Local',
          multipliers: {
            home: m.multiplierHome || 1.5,
            draw: m.multiplierDraw || 3.5,
            away: m.multiplierAway || 2.8,
          },
          pools: { home: 0, draw: 0, away: 0 },
          isLive,
          status: m.status,
          score: undefined,
          minute,
          logoHome: m.home_team?.logoUrl,
          logoAway: m.away_team?.logoUrl,
        };
      }).filter((m: any) => m.status !== 'FINISHED');
    }
    return demoMatches;
  }, [live, supaMatches, demoMatches]);

  const filteredMatches = useMemo(() => {
    let result = normalizedMatches;

    if (activeFilter === 'live') result = result.filter((m: any) => m.isLive);
    else if (activeFilter === 'kings') result = result.filter((m: any) => m.league === 'Kings League');
    else if (activeFilter === 'local') result = result.filter((m: any) => m.league === 'Torneo Local');

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((m: any) =>
        m.homeTeam.toLowerCase().includes(q) ||
        m.awayTeam.toLowerCase().includes(q)
      );
    }

    return result;
  }, [normalizedMatches, activeFilter, searchQuery]);

  const liveCount = useMemo(() => normalizedMatches.filter((m: any) => m.isLive).length, [normalizedMatches]);

  function handleMultiplierClick(matchId: string, homeTeam: string, awayTeam: string, prediction: PredictionType, multiplier: number) {
    const labels: Record<PredictionType, string> = {
      HOME_WIN: `Gana ${homeTeam}`,
      DRAW: 'Empate',
      AWAY_WIN: `Gana ${awayTeam}`,
    };
    openPredictionSlip({
      matchId,
      matchLabel: `${homeTeam} vs ${awayTeam}`,
      prediction,
      predictionLabel: labels[prediction],
      multiplier,
    });
  }

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* Search Bar */}
      <div className="bg-[#181817] px-3 pt-2 pb-0">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#c2b391] text-lg">search</span>
          <input
            type="text"
            placeholder="Buscar partidos, equipos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1f1e1c] border border-[#4c4843]/20 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-[#c2b391]/40 focus:ring-1 focus:ring-[#d72a22]/30 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c2b391] hover:text-white"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Sport Filter Tabs */}
      <nav className="bg-[#181817] flex overflow-x-auto gap-2 px-3 py-2.5 scrollbar-hide sticky top-16 z-30">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`rounded-full px-4 py-2 flex-shrink-0 cursor-pointer flex items-center gap-2 transition-all active:scale-95 ${
              activeFilter === f.id
                ? 'bg-[#393633] text-white shadow-md'
                : 'bg-[#1f1e1c] text-[#b8a98a] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{f.icon}</span>
            <span className="text-xs font-bold uppercase whitespace-nowrap">{f.label}</span>
            {f.id === 'live' && liveCount > 0 && (
              <span className="bg-[#d72a22] text-white text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                {liveCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      <main className="px-3 pt-4 space-y-3">
        {/* Live Promo Banner */}
        <section className="relative h-40 rounded-xl overflow-hidden mb-4 group cursor-pointer active:scale-[0.99] transition-transform">
          <div className="absolute inset-0 bg-gradient-to-r from-[#131312] via-[#131312]/60 to-transparent z-10" />
          <img
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9JI7ltZdot5OlIsWgcw3mZK7g-TMvLXjLNTwLy1qVAqOpooquOO3cdqQQHglh5a6vSIhgoL-F1vGfVceoMbYLlSVOwX1FfK4wcof6dzkqoqs-Xcu5teC9tuGxgqECOW0kXPwXMqo-fnOKsedPYVmBKbSomUfHlbNNvZVP8bNuN0lPlRLPnFWUvqQ03cTKUA0NoVWnBOUPf-XVfZXsU843HALqJ1sYjNLmnQgDrp7wkeJ8ZmZ99hE9JM4on-5PagXITPMsDusngOyM"
            alt="Estadio"
          />
          <div className="relative z-20 p-5 flex flex-col justify-center h-full">
            <span className="text-[#f2d27a] font-bold text-[10px] tracking-widest uppercase flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#f2d27a] shadow-[0_0_8px_#f2d27a] animate-pulse" /> Live Now
            </span>
            <h2 className="text-2xl font-black text-white italic leading-tight mb-3">
              CHAMPIONS<br />PREDICTOR
            </h2>
            <button
              onClick={() => {
                const liveMatch = normalizedMatches.find((m: any) => m.isLive);
                if (liveMatch) navigate(`/match/${liveMatch.id}`);
              }}
              className="bg-[#d72a22] text-white w-fit px-5 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider active:scale-95 duration-150 shadow-[0_2px_10px_rgba(215,42,34,0.3)]"
            >
              Pronosticar Ahora
            </button>
          </div>
        </section>

        {/* Section Title */}
        <div className="flex justify-between items-end px-1 mb-1">
          <h3 className="font-bold text-[#efe6d2] uppercase text-xs tracking-widest">
            {activeFilter === 'live' ? 'Partidos En Vivo' : 'Partidos Disponibles'}
          </h3>
          <span className="text-[10px] text-[#b8a98a] font-bold tabular-nums">{filteredMatches.length} partidos</span>
        </div>

        {/* No Results */}
        {filteredMatches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-4xl text-[#4c4843] mb-3">sports_soccer</span>
            <h4 className="text-white font-bold mb-1">Sin resultados</h4>
            <p className="text-[#c2b391] text-xs">No se encontraron partidos con ese filtro</p>
          </div>
        )}

        {/* Match Cards */}
        {supaLoading && live ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-[#d72a22] border-t-transparent rounded-full" />
          </div>
        ) : filteredMatches.map((match: any) => {
          const isSelected = predictionSlipSelection?.matchId === match.id;
          return (
            <div
              key={match.id}
              className={`bg-[#1f1e1c] rounded-xl p-3.5 space-y-3 transition-all duration-200 ${
                isSelected ? 'ring-1 ring-[#d72a22] shadow-[0_0_20px_rgba(20,117,225,0.15)]' : 'hover:bg-[#1e3141]'
              }`}
            >
              {/* Match Header */}
              <div className="flex justify-between items-center text-[10px] font-bold tracking-tight">
                <span className="text-[#b8a98a]">
                  {match.isLive ? (
                    <span className="flex items-center gap-1.5 text-[#f2d27a]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f2d27a] live-pulse" />
                      EN VIVO • {match.minute}'
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">schedule</span>
                      {match.date}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#c2b391] uppercase tracking-widest text-[8px]">{match.league}</span>
                  <div className="flex items-center gap-1 bg-[#181817] px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f2d27a]" />
                    <span className="text-[#efe6d2] uppercase text-[8px]">Pool</span>
                  </div>
                </div>
              </div>

              {/* Teams + Score */}
              <div
                className="flex items-center justify-between cursor-pointer group"
                onClick={() => navigate(`/match/${match.id}`)}
              >
                <div className="flex flex-col gap-2 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-[#2e2c29] rounded-full flex items-center justify-center text-[9px] font-black italic text-[#efe6d2]">
                      {match.homeInitials}
                    </div>
                    <span className="font-bold text-white text-sm group-hover:text-[#f0d9a8] transition-colors">{match.homeTeam}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-[#2e2c29] rounded-full flex items-center justify-center text-[9px] font-black italic text-[#efe6d2]">
                      {match.awayInitials}
                    </div>
                    <span className="font-bold text-white text-sm group-hover:text-[#f0d9a8] transition-colors">{match.awayTeam}</span>
                  </div>
                </div>
                {match.score && (
                  <div className="flex flex-col items-center gap-0.5 px-4">
                    <span className="text-white font-black text-lg tabular-nums">{match.score.home}</span>
                    <span className="text-[#4c4843] text-[10px]">—</span>
                    <span className="text-white font-black text-lg tabular-nums">{match.score.away}</span>
                  </div>
                )}
                <span className="material-symbols-outlined text-[#4c4843] text-sm ml-2 group-hover:text-[#c2b391] transition-colors">chevron_right</span>
              </div>

              {/* Odds Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {([
                  { type: 'HOME_WIN' as PredictionType, label: '1', value: match.multipliers.home },
                  { type: 'DRAW' as PredictionType, label: 'X', value: match.multipliers.draw },
                  { type: 'AWAY_WIN' as PredictionType, label: '2', value: match.multipliers.away },
                ]).map(({ type, label, value }) => {
                  const isOddSelected = predictionSlipSelection?.matchId === match.id && predictionSlipSelection?.prediction === type;
                  return (
                    <button
                      key={type}
                      onClick={() => handleMultiplierClick(match.id, match.homeTeam, match.awayTeam, type, value)}
                      className={`flex justify-between items-center px-3 py-3 rounded-lg transition-all duration-150 group/btn active:scale-95 ${
                        isOddSelected
                          ? 'bg-[#d72a22]/20 border-2 border-[#d72a22] shadow-[0_0_12px_rgba(20,117,225,0.2)]'
                          : 'bg-[#393633] hover:bg-[#4a4641] border border-transparent'
                      }`}
                    >
                      <span className={`text-[11px] font-bold ${isOddSelected ? 'text-[#f0d9a8]' : 'text-[#b8a98a] group-hover/btn:text-white'}`}>
                        {label}
                      </span>
                      <span className={`text-sm font-black tabular-nums ${isOddSelected ? 'text-white' : 'text-white'}`}>{value.toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Bottom spacer */}
        <div className="h-4" />
      </main>
    </div>
  );
}
