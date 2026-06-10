// ============================================
// CLUB PYP — MatchDetailPage (Live + Demo)
// ============================================
// B1 FIX: Now uses useMatchMarketById for live Supabase data

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore, PredictionType } from '../stores/appStore';
import { useMatchMarketById, useIsLive } from '../hooks/useSupabaseData';

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const openPredictionSlip = useAppStore((s) => s.openPredictionSlip);
  const predictionSlipSelection = useAppStore((s) => s.predictionSlipSelection);
  const predictions = useAppStore((s) => s.predictions);

  const [activeTab, setActiveTab] = useState('stats');
  const tabs = ['Stats', 'H2H', 'Pool Info'];

  const live = useIsLive();
  const { match: supaMatch, loading } = useMatchMarketById(id);
  const demoMatch = useAppStore((s) => s.getMatch(id || ''));

  // Normalize match data for unified rendering
  const match = useMemo(() => {
    if (live && supaMatch) {
      const m = supaMatch as any;
      const homeName = m.home_team?.name || 'Local';
      const awayName = m.away_team?.name || 'Visitante';
      const homeInit = homeName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
      const awayInit = awayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

      return {
        id: m.id,
        homeTeam: homeName,
        awayTeam: awayName,
        homeInitials: homeInit,
        awayInitials: awayInit,
        date: new Date(m.startTime).toLocaleDateString('es-CO', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        startTime: m.startTime,
        league: 'Torneo Local',
        multipliers: {
          home: m.multiplierHome || 1,
          draw: m.multiplierDraw || 1,
          away: m.multiplierAway || 1,
        },
        pools: { home: 0, draw: 0, away: 0 }, // Not tracked in current schema
        isLive: m.status === 'CLOSED',
        status: m.status,
        score: undefined as { home: number; away: number } | undefined,
        minute: undefined as number | undefined,
        stats: undefined as any,
      };
    }
    return demoMatch || null;
  }, [live, supaMatch, demoMatch]);

  const matchPredictions = useMemo(() => predictions.filter((b) => b.matchId === id), [predictions, id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-[#d72a22] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <span className="material-symbols-outlined text-5xl text-[#4a3f2c] mb-4">error_outline</span>
        <h2 className="text-white font-bold text-lg mb-2">Partido no encontrado</h2>
        <p className="text-[#c2b391] text-sm text-center mb-6">Este partido no existe o fue eliminado</p>
        <button onClick={() => navigate('/')} className="bg-[#d72a22] text-white px-6 py-3 rounded-lg font-bold text-sm">
          Volver al Inicio
        </button>
      </div>
    );
  }

  const totalPool = (match.pools?.home || 0) + (match.pools?.draw || 0) + (match.pools?.away || 0);

  function handleBet(prediction: PredictionType) {
    const labels: Record<PredictionType, string> = {
      HOME_WIN: `Gana ${match!.homeTeam}`,
      DRAW: 'Empate',
      AWAY_WIN: `Gana ${match!.awayTeam}`,
    };
    const multiplierMap: Record<PredictionType, number> = {
      HOME_WIN: match!.multipliers.home,
      DRAW: match!.multipliers.draw,
      AWAY_WIN: match!.multipliers.away,
    };
    openPredictionSlip({
      matchId: match!.id,
      matchLabel: `${match!.homeTeam} vs ${match!.awayTeam}`,
      prediction,
      predictionLabel: labels[prediction],
      multiplier: multiplierMap[prediction],
    });
  }

  return (
    <div className="pb-24">
      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Scoreboard Hero */}
        <section className="bg-[#1c1610] rounded-xl overflow-hidden relative">
          <div className="absolute inset-0 opacity-10 pointer-events-none dot-pattern" />
          <div className="relative p-6 flex flex-col items-center">
            {/* Status Badge */}
            <div className="flex items-center gap-2 bg-[#2e2418] px-3 py-1 rounded-full mb-6">
              {match.isLive ? (
                <>
                  <span className="w-2 h-2 bg-[#f2d27a] rounded-full live-pulse" />
                  <span className="text-[#f2d27a] text-[10px] font-black uppercase tracking-[0.2em]">En Vivo</span>
                </>
              ) : match.status === 'FINISHED' ? (
                <>
                  <span className="material-symbols-outlined text-[#ffb4ab] text-xs">flag</span>
                  <span className="text-[#ffb4ab] text-[10px] font-black uppercase tracking-[0.15em]">Finalizado</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[#f0d9a8] text-xs">schedule</span>
                  <span className="text-[#f0d9a8] text-[10px] font-black uppercase tracking-[0.15em]">{match.date}</span>
                </>
              )}
            </div>

            <div className="flex justify-between items-center w-full">
              {/* Home Team */}
              <div className="flex flex-col items-center flex-1">
                <div className="w-20 h-20 bg-[#2e2418] rounded-full flex items-center justify-center mb-3 shadow-xl border border-[#4a3f2c]/10">
                  <span className="text-2xl font-black italic text-[#efe6d2]">{match.homeInitials}</span>
                </div>
                <span className="text-[#efe6d2] font-bold text-center leading-tight text-sm">{match.homeTeam}</span>
              </div>

              {/* Score / vs */}
              <div className="flex flex-col items-center px-4">
                {match.score ? (
                  <>
                    <div className="text-5xl font-black tracking-tighter text-white flex items-center gap-3 tabular-nums">
                      <span>{match.score.home}</span>
                      <span className="text-[#c2b391]/30 text-3xl">-</span>
                      <span>{match.score.away}</span>
                    </div>
                    {match.minute && (
                      <div className="mt-2 text-[#f2d27a] font-mono font-bold text-sm bg-[#f2d27a]/10 px-3 py-0.5 rounded">
                        {match.minute}' MIN
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-3xl font-black text-[#4a3f2c]">VS</span>
                )}
              </div>

              {/* Away Team */}
              <div className="flex flex-col items-center flex-1">
                <div className="w-20 h-20 bg-[#2e2418] rounded-full flex items-center justify-center mb-3 shadow-xl border border-[#4a3f2c]/10">
                  <span className="text-2xl font-black italic text-[#efe6d2]">{match.awayInitials}</span>
                </div>
                <span className="text-[#efe6d2] font-bold text-center leading-tight text-sm">{match.awayTeam}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Bet Buttons — only if match is OPEN */}
        {match.status === 'OPEN' && (
          <section className="grid grid-cols-3 gap-2">
            {([
              { type: 'HOME_WIN' as PredictionType, label: '1', sublabel: match.homeTeam.split(' ')[0], value: match.multipliers.home },
              { type: 'DRAW' as PredictionType, label: 'X', sublabel: 'Empate', value: match.multipliers.draw },
              { type: 'AWAY_WIN' as PredictionType, label: '2', sublabel: match.awayTeam.split(' ')[0], value: match.multipliers.away },
            ]).map(({ type, label, sublabel, value }) => {
              const isSelected = predictionSlipSelection?.matchId === match.id && predictionSlipSelection?.prediction === type;
              return (
                <button
                  key={type}
                  onClick={() => handleBet(type)}
                  className={`flex flex-col items-center py-4 px-2 rounded-xl transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-[#d72a22]/20 border-2 border-[#d72a22] shadow-[0_0_15px_rgba(20,117,225,0.25)]'
                      : 'bg-[#3a2d1c] border border-transparent hover:bg-[#4a3d28]'
                  }`}
                >
                  <span className="text-[10px] text-[#c2b391] font-bold mb-1 truncate w-full text-center">{sublabel}</span>
                  <span className="text-xl font-black text-white tabular-nums">{value.toFixed(2)}</span>
                  <span className={`text-[9px] font-bold uppercase mt-1 ${isSelected ? 'text-[#f0d9a8]' : 'text-[#b8a98a]'}`}>{label}</span>
                </button>
              );
            })}
          </section>
        )}

        {/* Closed/Finished state */}
        {match.status !== 'OPEN' && (
          <div className="bg-[#2e2418]/50 rounded-xl p-4 text-center">
            <span className="material-symbols-outlined text-2xl text-[#c2b391] mb-2">lock</span>
            <p className="text-[#c2b391] text-sm font-bold">
              {match.status === 'FINISHED' ? 'Este partido ya fue liquidado' : 'Los pronósticos están cerrados'}
            </p>
          </div>
        )}

        {/* My Predictions on this match */}
        {matchPredictions.length > 0 && (
          <section className="bg-[#140f0a] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[#f0d9a8] text-sm">confirmation_number</span>
              <h3 className="text-xs font-black uppercase tracking-widest text-[#f0d9a8]">Mis Pronósticos en este partido</h3>
            </div>
            <div className="space-y-2">
              {matchPredictions.map((pred) => (
                <div key={pred.id} className="flex justify-between items-center bg-[#1c1610] rounded-lg p-3">
                  <div>
                    <p className="text-white text-xs font-bold">{pred.predictionLabel}</p>
                    <p className="text-[#c2b391] text-[10px]">{pred.amount.toLocaleString()} PyP @ {pred.multiplier.toFixed(2)}</p>
                  </div>
                  <span className={`text-xs font-black ${
                    pred.status === 'PENDING' ? 'text-[#f0d9a8]' : pred.status === 'WON' ? 'text-[#f2d27a]' : 'text-[#ffb4ab]'
                  }`}>
                    {pred.status === 'PENDING' ? `Est. ${pred.estimatedReturn.toLocaleString()} PyP` : pred.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tab Navigation */}
        <nav className="flex bg-[#140f0a] rounded-xl p-1 gap-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase().replace(' ', '-'))}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors rounded-lg ${
                activeTab === tab.toLowerCase().replace(' ', '-')
                  ? 'text-white bg-[#1c1610]'
                  : 'text-[#c2b391] hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* Stats Section */}
        {activeTab === 'stats' && match.stats && (
          <section className="bg-[#1c1610] rounded-xl p-5 space-y-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#f0d9a8]">Estadísticas del Partido</h3>
              <span className="material-symbols-outlined text-[#c2b391] text-sm">analytics</span>
            </div>

            {[
              { label: 'Posesión', home: match.stats.possession.home, away: match.stats.possession.away, isPct: true },
              { label: 'Tiros', home: match.stats.shots.home, away: match.stats.shots.away },
              { label: 'Tiros a Puerta', home: match.stats.shotsOnTarget.home, away: match.stats.shotsOnTarget.away },
              { label: 'Corners', home: match.stats.corners.home, away: match.stats.corners.away },
              { label: 'Faltas', home: match.stats.fouls.home, away: match.stats.fouls.away },
              { label: 'Tarjetas Amarillas', home: match.stats.yellowCards.home, away: match.stats.yellowCards.away },
            ].map(({ label, home, away, isPct }) => {
              const total = home + away || 1;
              const homeWidth = isPct ? home : (home / total) * 100;
              const awayWidth = isPct ? away : (away / total) * 100;
              return (
                <div key={label} className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-[#c2b391] uppercase tracking-wider">
                    <span className="text-white font-black tabular-nums">{isPct ? `${home}%` : home}</span>
                    <span>{label}</span>
                    <span className="text-white font-black tabular-nums">{isPct ? `${away}%` : away}</span>
                  </div>
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-[#2e2418] gap-0.5">
                    <div className="h-full bg-[#e5b85c] rounded-full transition-all duration-500" style={{ width: `${homeWidth}%` }} />
                    <div className="h-full bg-[#d72a22] rounded-full transition-all duration-500" style={{ width: `${awayWidth}%` }} />
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {activeTab === 'stats' && !match.stats && (
          <div className="bg-[#1c1610] rounded-xl p-8 text-center">
            <span className="material-symbols-outlined text-3xl text-[#4a3f2c] mb-2">analytics</span>
            <p className="text-[#c2b391] text-sm">Las estadísticas estarán disponibles cuando el partido comience</p>
          </div>
        )}

        {/* H2H Section */}
        {activeTab === 'h2h' && (
          <section className="bg-[#1c1610] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#f0d9a8]">Head to Head</h3>
              <span className="text-[10px] font-bold text-[#c2b391] uppercase">Últimos 3</span>
            </div>
            <div className="space-y-3">
              {[
                { date: '15 Oct 2025', homeGoals: 3, awayGoals: 1 },
                { date: '22 May 2025', homeGoals: 0, awayGoals: 0 },
                { date: '10 Jan 2025', homeGoals: 1, awayGoals: 2 },
              ].map((h, i) => {
                const homeResult = h.homeGoals > h.awayGoals ? 'WIN' : h.homeGoals < h.awayGoals ? 'LOSS' : 'DRAW';
                const awayResult = h.awayGoals > h.homeGoals ? 'WIN' : h.awayGoals < h.homeGoals ? 'LOSS' : 'DRAW';
                return (
                  <div key={i} className="flex items-center bg-[#140f0a] rounded-lg p-3 gap-4">
                    <span className="text-xs font-bold text-[#c2b391] w-24">{h.date}</span>
                    <div className="flex-1 flex justify-center items-center gap-3">
                      <span className={`text-[10px] font-black ${homeResult === 'WIN' ? 'text-[#f2d27a]' : homeResult === 'LOSS' ? 'text-[#ffb4ab]' : 'text-[#c2b391]'}`}>
                        {match.homeInitials}
                      </span>
                      <span className="bg-[#2e2418] px-3 py-1 rounded text-sm font-black text-white tabular-nums">
                        {h.homeGoals} - {h.awayGoals}
                      </span>
                      <span className={`text-[10px] font-black ${awayResult === 'WIN' ? 'text-[#f2d27a]' : awayResult === 'LOSS' ? 'text-[#ffb4ab]' : 'text-[#c2b391]'}`}>
                        {match.awayInitials}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Pool Info Section */}
        {activeTab === 'pool-info' && totalPool > 0 && (
          <section className="bg-[#1c1610] rounded-xl p-5 space-y-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#f0d9a8]">Distribución del Fondo</h3>
              <span className="text-[#e5b85c] font-black text-sm tabular-nums">{totalPool.toLocaleString()} PyP</span>
            </div>

            {[
              { label: `Gana ${match.homeTeam}`, pool: match.pools.home, color: '#e5b85c' },
              { label: 'Empate', pool: match.pools.draw, color: '#f0d9a8' },
              { label: `Gana ${match.awayTeam}`, pool: match.pools.away, color: '#d72a22' },
            ].map(({ label, pool, color }) => (
              <div key={label} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[#c2b391] text-xs font-bold">{label}</span>
                  <span className="text-white font-black text-xs tabular-nums">{pool.toLocaleString()} PyP ({((pool / totalPool) * 100).toFixed(1)}%)</span>
                </div>
                <div className="h-3 w-full bg-[#2e2418] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(pool / totalPool) * 100}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            ))}

            <div className="bg-[#140f0a] rounded-lg p-3 flex items-start gap-3 mt-2">
              <span className="material-symbols-outlined text-[#f0d9a8] text-sm mt-0.5">info</span>
              <p className="text-[#c2b391] text-[10px] leading-relaxed">
                En el modelo Pari-Mutuel, los multiplicadores finales dependen del total pronosticado en cada resultado.
                Se aplica un 20% de comisión sobre el fondo total. Los multiplicadores mostrados son estimados y pueden cambiar.
              </p>
            </div>
          </section>
        )}

        {activeTab === 'pool-info' && totalPool === 0 && (
          <div className="bg-[#1c1610] rounded-xl p-8 text-center">
            <span className="material-symbols-outlined text-3xl text-[#4a3f2c] mb-2">account_balance</span>
            <p className="text-[#c2b391] text-sm">Los multiplicadores actuales son fijos. La modalidad Pari-Mutuel no está activa en este partido.</p>
          </div>
        )}
      </main>
    </div>
  );
}
