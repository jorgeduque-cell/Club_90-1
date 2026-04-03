// ============================================
// CLUB 90 — MyBetsPage (Fully Functional)
// ============================================

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';
import { useMyTickets, useIsLive } from '../hooks/useSupabaseData';

const FILTERS = ['All', 'Pending', 'Won', 'Lost'];

export default function MyBetsPage() {
  const navigate = useNavigate();
  const demoPredictions = useAppStore((s) => s.predictions);
  const predictionFilter = useAppStore((s) => s.predictionFilter);
  const setPredictionFilter = useAppStore((s) => s.setPredictionFilter);
  const earlyReturn = useAppStore((s) => s.earlyReturn);
  const live = useIsLive();
  const { tickets: supaBets, loading } = useMyTickets();

  // Normalize bets from new schema (prediction_tickets + ticket_items)
  const bets = useMemo(() => {
    if (live) {
      return supaBets.map((t: any) => {
        const items = t.ticket_items || [];
        const firstItem = items[0];
        const mm = firstItem?.match_market;
        const homeName = mm?.home_team?.name || 'Local';
        const awayName = mm?.away_team?.name || 'Visitante';
        const prediction = firstItem?.selectedOutcome || 'HOME_WIN';
        const totalMult = items.reduce((acc: number, i: any) => acc * (i.lockedMultiplier || 1), 1);

        return {
          id: t.id,
          matchId: firstItem?.matchMarketId || '',
          match: items.length > 1
            ? `Combinada (${items.length} partidos)`
            : `${homeName} vs ${awayName}`,
          league: 'Torneo Local',
          prediction,
          predictionLabel: prediction === 'HOME_WIN' ? `Gana ${homeName}` : prediction === 'DRAW' ? 'Empate' : `Gana ${awayName}`,
          amount: t.totalAmount || 0,
          multiplier: Math.round(totalMult * 100) / 100,
          estimatedReturn: t.potentialReturn || 0,
          status: t.status === 'HIT' ? 'WON' : t.status === 'MISSED' ? 'LOST' : 'PENDING',
          isLive: false,
          earlyReturn: undefined,
          createdAt: t.createdAt,
        };
      });
    }
    return demoPredictions;
  }, [live, supaBets, demoPredictions]);

  const filtered = useMemo(() => {
    if (predictionFilter === 'All') return bets;
    return bets.filter((b: any) => b.status === predictionFilter.toUpperCase());
  }, [bets, predictionFilter]);

  const stats = useMemo(() => ({
    total: bets.length,
    pending: bets.filter((b) => b.status === 'PENDING').length,
    won: bets.filter((b) => b.status === 'WON').length,
    totalStaked: bets.reduce((sum, b) => sum + b.amount, 0),
    totalWon: bets.filter((b) => b.status === 'WON').reduce((sum, b) => sum + b.estimatedReturn, 0),
  }), [bets]);

  return (
    <main className="pb-24 min-h-screen bg-[#0f212e]">
      {/* Stats Summary */}
      <div className="bg-[#1a2c39] px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-[#c1c6d5] text-[9px] font-bold uppercase tracking-widest">Pronósticos</p>
            <p className="text-white font-black text-xl tabular-nums">{stats.total}</p>
          </div>
          <div className="text-center">
            <p className="text-[#c1c6d5] text-[9px] font-bold uppercase tracking-widest">Arriesgado</p>
            <p className="text-white font-black text-xl tabular-nums">{stats.totalStaked.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-[#c1c6d5] text-[9px] font-bold uppercase tracking-widest">Ganado</p>
            <p className="text-[#77ff61] font-black text-xl tabular-nums">{stats.totalWon.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="sticky top-16 z-40 bg-[#0f212e]/95 backdrop-blur-md px-4 py-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {FILTERS.map((f) => {
            const count = f === 'All' ? bets.length : bets.filter((b) => b.status === f.toUpperCase()).length;
            return (
              <button
                key={f}
                onClick={() => setPredictionFilter(f)}
                className={`px-4 py-2 rounded-lg font-bold text-xs whitespace-nowrap transition-all active:scale-95 flex items-center gap-1.5 ${
                  predictionFilter === f
                    ? 'bg-[#1475e1] text-white'
                    : 'bg-[#253744] text-[#c1c6d5] hover:bg-[#2a3b49]'
                }`}
              >
                {f === 'All' ? 'Todas' : f === 'Pending' ? 'Pendientes' : f === 'Won' ? 'Ganadas' : 'Perdidas'}
                {count > 0 && (
                  <span className={`text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center ${
                    predictionFilter === f ? 'bg-white/20' : 'bg-[#414753]'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {bets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-8">
          <span className="material-symbols-outlined text-5xl text-[#414753] mb-4">receipt_long</span>
          <h3 className="text-white font-bold text-lg mb-2">Sin pronósticos aún</h3>
          <p className="text-[#c1c6d5] text-sm text-center mb-6">
            ¡Selecciona un partido y haz tu primer pronóstico para empezar!
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-[#00e601] text-[#013a00] px-8 py-3 rounded-xl font-black uppercase text-sm tracking-wider active:scale-95 transition-all"
          >
            Ver Partidos
          </button>
        </div>
      )}

      {filtered.length === 0 && bets.length > 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-8">
          <span className="material-symbols-outlined text-3xl text-[#414753] mb-3">filter_list</span>
          <p className="text-[#c1c6d5] text-sm">No hay pronósticos con este filtro</p>
        </div>
      )}

      {/* Bet Cards */}
      <div className="px-4 space-y-3 mt-1">
        {filtered.map((bet) => (
          <div
            key={bet.id}
            className={`bg-[#1a2c39] rounded-xl overflow-hidden shadow-sm transition-all duration-200 ${
              bet.status === 'LOST' ? 'opacity-70' : ''
            }`}
          >
            <div className="p-4 space-y-3">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <h3
                    className="text-sm font-extrabold text-white tracking-tight leading-tight truncate cursor-pointer hover:text-[#aac7ff]"
                    onClick={() => navigate(`/match/${bet.matchId}`)}
                  >
                    {bet.match}
                  </h3>
                  <p className="text-[10px] text-[#c1c6d5] font-medium">{bet.league}</p>
                </div>
                <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                  {bet.isLive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#77ff61] shadow-[0_0_8px_rgba(119,255,97,0.5)] animate-pulse" />
                  )}
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    bet.status === 'WON'
                      ? 'bg-[#00e601]/10 text-[#77ff61]'
                      : bet.status === 'LOST'
                      ? 'bg-[#93000a]/20 text-[#ffb4ab]'
                      : 'bg-[#1475e1]/10 text-[#aac7ff]'
                  }`}>
                    {bet.status === 'WON' ? 'Ganada' : bet.status === 'LOST' ? 'Perdida' : 'Pendiente'}
                  </span>
                </div>
              </div>

              {/* Prediction */}
              <div className="bg-[#0f212e] rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="text-[#aac7ff] text-xs font-bold">{bet.predictionLabel}</span>
                <span className="text-white font-black tabular-nums">@ {bet.multiplier.toFixed(2)}</span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="text-[9px] uppercase font-bold text-[#c1c6d5] tracking-widest">Monto</span>
                  <p className="text-sm font-bold text-white tabular-nums">{bet.amount.toLocaleString()} CL</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-[#c1c6d5] tracking-widest">Factor</span>
                  <p className="text-sm font-bold text-[#aac7ff] tabular-nums">{bet.multiplier.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-[#c1c6d5] tracking-widest">
                    {bet.status === 'PENDING' ? 'Est. Pago' : 'Pago'}
                  </span>
                  <p className={`text-sm font-bold tabular-nums ${
                    bet.status === 'WON' ? 'text-[#77ff61]' : bet.status === 'LOST' ? 'text-[#ffb4ab]' : 'text-white'
                  }`}>
                    {bet.status === 'LOST' ? '0' : bet.estimatedReturn.toLocaleString()} CL
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-[#253744]/30 px-4 py-2.5 flex justify-between items-center">
              <span className="text-[10px] text-[#c1c6d5] flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">confirmation_number</span>
                {bet.id.slice(0, 12)}
              </span>
              {bet.earlyReturn ? (
                <button
                  onClick={() => earlyReturn(bet.id)}
                  className="bg-[#1475e1] text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-md hover:bg-[#1a8af7]"
                >
                  Retiro Anticipado {bet.earlyReturn.toLocaleString()} CL
                </button>
              ) : (
                <button
                  onClick={() => navigate(`/match/${bet.matchId}`)}
                  className="text-[#aac7ff] text-[10px] font-bold uppercase tracking-widest hover:underline flex items-center gap-1"
                >
                  Detalles
                  <span className="material-symbols-outlined text-xs">chevron_right</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
