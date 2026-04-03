import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppStore, Transaction } from '../stores/appStore';
import { useIsLive, useMyTickets, useTransactions } from '../hooks/useSupabaseData';

export default function ProfilePage() {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const demoBalance = useAppStore((s) => s.balance);
  const demoUserName = useAppStore((s) => s.userName);
  const tier = useAppStore((s) => s.tier);
  const xp = useAppStore((s) => s.xp);
  const xpToNext = useAppStore((s) => s.xpToNext);
  const demoTransactions = useAppStore((s) => s.transactions);
  const demoPredictions = useAppStore((s) => s.predictions);
  const openTopUpModal = useAppStore((s) => s.openTopUpModal);
  const openRewardsModal = useAppStore((s) => s.openRewardsModal);
  const openRulesModal = useAppStore((s) => s.openRulesModal);
  const openPrizesModal = useAppStore((s) => s.openPrizesModal);
  const selectedTransaction = useAppStore((s) => s.selectedTransaction);
  const openTransactionDetail = useAppStore((s) => s.openTransactionDetail);
  const closeTransactionDetail = useAppStore((s) => s.closeTransactionDetail);

  const live = useIsLive();
  const { tickets: supaTickets } = useMyTickets();
  const { transactions: supaTxns } = useTransactions();

  const balance = live && profile ? profile.clCoins : demoBalance;
  const userName = live && profile ? (profile.name || 'Jugador') : demoUserName;

  // Normalize tickets for stats
  const bets = useMemo(() => {
    if (live) {
      return supaTickets.map((t: any) => ({ status: t.status }));
    }
    return demoPredictions;
  }, [live, supaTickets, demoPredictions]);

  // Normalize transactions for display
  const transactions = useMemo(() => {
    if (live) {
      return supaTxns.map((t: any) => {
        const coins = t.coinsAdded ?? 0;
        const isDebit = coins < 0 || t.type === 'BET_PLACED' || t.type === 'STORE_REDEMPTION';

        // Human-readable label (Spanish)
        const labelMap: Record<string, string> = {
          'PREMIUM_PASS': '⭐ Pase Premium',
          'LIFESAVER_TOPUP': '❤️ Vida Extra',
          'BET_PLACED': '🎯 Pronóstico',
          'WINNINGS_PAID': '🏆 Acierto',
          'STORE_REDEMPTION': '🎁 Canje Kiosco',
          'REWARD_REDEMPTION': coins < 0 ? '🎯 Pronóstico' : '🏆 Premio',
          'DEPOSIT': '💰 Recarga',
        };

        const iconMap: Record<string, string> = {
          'PREMIUM_PASS': 'star',
          'LIFESAVER_TOPUP': 'add_circle',
          'BET_PLACED': 'sports_esports',
          'WINNINGS_PAID': 'emoji_events',
          'STORE_REDEMPTION': 'redeem',
          'REWARD_REDEMPTION': coins < 0 ? 'sports_esports' : 'emoji_events',
          'DEPOSIT': 'add_circle',
        };

        const absAmount = Math.abs(coins) || Math.abs(t.amountCOP || 0);

        return {
          id: t.id,
          type: isDebit ? 'debit' as const : 'credit' as const,
          label: labelMap[t.type] || t.type,
          date: new Date(t.createdAt).toLocaleDateString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          amount: coins,
          amountLabel: `${isDebit ? '-' : '+'}${absAmount.toLocaleString()} 🪙`,
          icon: iconMap[t.type] || 'receipt_long',
          category: isDebit ? 'prediction_submit' as const : t.type === 'PREMIUM_PASS' || t.type === 'LIFESAVER_TOPUP' || t.type === 'DEPOSIT' ? 'topup' as const : 'prediction_win' as const,
        };
      });
    }
    return demoTransactions;
  }, [live, supaTxns, demoTransactions]);

  const xpPercent = Math.round((xp / xpToNext) * 100);
  const totalBets = bets.length;
  const wonBets = bets.filter((b) => b.status === 'HIT' || b.status === 'WON').length;
  const winRate = totalBets > 0 ? Math.round((wonBets / totalBets) * 100) : 0;

  const activeTx = useMemo<Transaction | null>(() => {
    if (!selectedTransaction) return null;
    return transactions.find((t) => t.id === selectedTransaction) || null;
  }, [selectedTransaction, transactions]);

  function handleSignOut() {
    signOut();
    navigate('/login', { replace: true });
  }

  const categoryLabels: Record<string, string> = {
    prediction_win: 'Beneficio de Acierto',
    prediction_submit: 'Pronóstico Realizado',
    bonus: 'Bonificación',
    early_return: 'Retiro Anticipado',
    redeem: 'Canje de Recompensa',
    topup: '+ Vida Extra',
  };

  const categoryColors: Record<string, string> = {
    prediction_win: '#77ff61',
    prediction_submit: '#aac7ff',
    bonus: '#ffc107',
    early_return: '#1475e1',
    redeem: '#9c27b0',
    topup: '#00e601',
  };

  return (
    <main className="pt-4 pb-24 px-4 max-w-md mx-auto space-y-4">
      {/* Balance Hero */}
      <section className="bg-[#1a2c39] rounded-xl p-5 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#77ff61]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-[#c1c6d5] text-[10px] font-bold uppercase tracking-widest mb-1">Total Balance</p>
            <h2 className="text-[#00e601] text-4xl font-extrabold tracking-tighter neon-glow tabular-nums">
              {balance.toLocaleString()}{' '}
              <span className="text-lg">🪙</span>
            </h2>
            <p className="text-[#c1c6d5] text-[11px] mt-1 font-medium">{userName}</p>
          </div>
          <div className={`${live ? 'bg-[#00e601]/20 text-[#77ff61] border-[#77ff61]/20' : 'bg-[#1475e1]/20 text-[#aac7ff] border-[#aac7ff]/20'} border px-3 py-1 rounded-full flex items-center gap-1.5`}>
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              {live ? 'verified' : 'workspace_premium'}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {live && profile ? profile.accountTier : tier}
            </span>
          </div>
        </div>

        {/* Recharge Button (Lifesaver) */}
        <button
          onClick={openTopUpModal}
          className="w-full bg-[#00e601] text-[#013a00] py-3.5 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(0,230,1,0.25)] mb-4"
        >
          <span className="material-symbols-outlined text-lg">medical_services</span>
          + 5.000 CL COINS (Vida Extra)
        </button>

        {/* Progress Bar — only show in demo mode */}
        {!live && (
          <div className="space-y-2">
            <div className="flex justify-between items-end text-[10px] font-bold uppercase tracking-wider">
              <span className="text-[#c1c6d5]">Progreso a Platinum</span>
              <span className="text-white tabular-nums">{xp.toLocaleString()} / {xpToNext.toLocaleString()} XP</span>
            </div>
            <div className="h-2.5 w-full bg-[#253744] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#1475e1] to-[#aac7ff] rounded-full transition-all duration-700 relative"
                style={{ width: `${xpPercent}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>
            <p className="text-[#c1c6d5] text-[10px] italic">{(xpToNext - xp).toLocaleString()} puntos hasta tu próxima recompensa</p>
          </div>
        )}
      </section>

      {/* Quick Stats */}
      <section className="grid grid-cols-3 gap-2">
        <div className="bg-[#1a2c39] rounded-xl p-3 text-center">
          <p className="text-[#c1c6d5] text-[9px] font-bold uppercase tracking-widest">Pronósticos</p>
          <p className="text-white font-black text-xl tabular-nums">{totalBets}</p>
        </div>
        <div className="bg-[#1a2c39] rounded-xl p-3 text-center">
          <p className="text-[#c1c6d5] text-[9px] font-bold uppercase tracking-widest">Ganadas</p>
          <p className="text-[#77ff61] font-black text-xl tabular-nums">{wonBets}</p>
        </div>
        <div className="bg-[#1a2c39] rounded-xl p-3 text-center">
          <p className="text-[#c1c6d5] text-[9px] font-bold uppercase tracking-widest">Win Rate</p>
          <p className="text-[#aac7ff] font-black text-xl tabular-nums">{winRate}%</p>
        </div>
      </section>

      {/* Action Buttons */}
      <section className="grid grid-cols-1 gap-2">
        <button
          onClick={openRewardsModal}
          className="bg-[#1a2c39] text-[#d2e5f7] h-16 rounded-xl flex items-center justify-between px-4 hover:bg-[#253744] transition-all active:scale-[0.98] group border border-[#253744]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00e601]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#00e601]">redeem</span>
            </div>
            <div className="text-left">
              <span className="font-bold text-sm text-white">Recompensas Semanales</span>
              <p className="text-[9px] text-[#c1c6d5] font-bold">Reclama tus premios de esta jornada</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-[#414753] group-hover:text-[#c1c6d5] transition-colors">chevron_right</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={openRulesModal}
            className="bg-[#1a2c39] text-[#d2e5f7] h-14 rounded-xl flex items-center justify-center gap-2 hover:bg-[#253744] transition-colors active:scale-[0.98] border border-[#253744]"
          >
            <span className="material-symbols-outlined text-[#aac7ff]">menu_book</span>
            <span className="font-bold uppercase tracking-widest text-[10px]">Reglas</span>
          </button>
          <button
            onClick={openPrizesModal}
            className="bg-[#1a2c39] text-[#d2e5f7] h-14 rounded-xl flex items-center justify-center gap-2 hover:bg-[#253744] transition-colors active:scale-[0.98] border border-[#253744]"
          >
            <span className="material-symbols-outlined text-[#ffd700]">emoji_events</span>
            <span className="font-bold uppercase tracking-widest text-[10px]">Premios</span>
          </button>
        </div>
      </section>

      {/* Transaction History */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[#d2e5f7] font-extrabold text-sm uppercase tracking-widest">Historial</h3>
          <span className="text-[#b1bad3] text-[10px] font-bold tabular-nums">{transactions.length} transacciones</span>
        </div>

        {transactions.length === 0 ? (
          <div className="bg-[#0f212e] rounded-xl p-8 text-center">
            <span className="material-symbols-outlined text-3xl text-[#414753] mb-2">receipt_long</span>
            <p className="text-[#c1c6d5] text-sm">Sin transacciones aún</p>
          </div>
        ) : (
          <div className="bg-[#0f212e] rounded-xl overflow-hidden">
            {transactions.slice(0, 15).map((tx) => (
              <button
                key={tx.id}
                onClick={() => openTransactionDetail(tx.id)}
                className="w-full flex items-center justify-between p-4 border-b border-[#414753]/15 last:border-0 hover:bg-[#1a2c39] transition-colors active:bg-[#253744] text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    tx.type === 'credit' ? 'bg-[#77ff61]/10 text-[#77ff61]' : 'bg-[#1475e1]/10 text-[#aac7ff]'
                  }`}>
                    <span className="material-symbols-outlined">{tx.icon}</span>
                  </div>
                  <div>
                    <p className="text-white text-xs font-bold">{tx.label}</p>
                    <p className="text-[#c1c6d5] text-[10px]">{tx.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className={`font-extrabold text-sm tabular-nums ${tx.type === 'credit' ? 'text-[#77ff61]' : 'text-white'}`}>
                    {tx.amountLabel}
                  </p>
                  <span className="material-symbols-outlined text-[#414753] text-sm">chevron_right</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Promo Card */}
      <button
        onClick={openPrizesModal}
        className="w-full relative bg-[#1a2c39] rounded-xl p-4 border-l-4 border-[#1475e1] overflow-hidden text-left hover:bg-[#253744] transition-colors active:scale-[0.99] group"
      >
        <div className="relative z-10 flex gap-4 items-center">
          <div className="flex-1">
            <h4 className="text-white font-bold text-xs mb-1">¡Premios de Fin de Temporada!</h4>
            <p className="text-[#c1c6d5] text-[10px] leading-relaxed">
              Top 3 del ranking ganan premios reales. Toca para ver los detalles.
            </p>
          </div>
          <div className="bg-[#aac7ff]/20 p-2.5 rounded-xl group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[#aac7ff]">emoji_events</span>
          </div>
        </div>
      </button>

      {/* Logout */}
      <button
        onClick={handleSignOut}
        className="w-full py-3 text-[#ffb4ab] text-xs font-bold uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-sm">logout</span>
        Cerrar Sesión
      </button>

      {/* ─── Transaction Detail Modal ─── */}
      {activeTx && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[90] backdrop-blur-sm" onClick={closeTransactionDetail} />
          <div className="fixed inset-x-0 bottom-0 z-[95]">
            <div className="bg-[#0f212e] rounded-t-2xl shadow-2xl border-t border-[#253744]">
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-[#414753] rounded-full" />
              </div>
              <div className="p-5 space-y-5">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      activeTx.type === 'credit' ? 'bg-[#77ff61]/15 text-[#77ff61]' : 'bg-[#1475e1]/15 text-[#aac7ff]'
                    }`}>
                      <span className="material-symbols-outlined text-2xl">{activeTx.icon}</span>
                    </div>
                    <div>
                      <h3 className="text-white font-black text-base">{activeTx.label}</h3>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        activeTx.type === 'credit' ? 'bg-[#77ff61]/10 text-[#77ff61]' : 'bg-[#aac7ff]/10 text-[#aac7ff]'
                      }`}>
                        {activeTx.type === 'credit' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </div>
                  </div>
                  <button onClick={closeTransactionDetail} className="text-[#b1bad3] hover:text-white p-1">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                {/* Amount Hero */}
                <div className="text-center py-3">
                  <p className={`text-4xl font-black tabular-nums tracking-tighter ${
                    activeTx.type === 'credit' ? 'text-[#00e601]' : 'text-white'
                  }`}>
                    {activeTx.amountLabel}
                  </p>
                  <p className="text-[#c1c6d5] text-[10px] font-bold uppercase tracking-widest mt-1">🪙 CL COINS</p>
                </div>

                {/* Details Grid */}
                <div className="bg-[#1a2c39] rounded-xl divide-y divide-[#414753]/15">
                  <div className="flex justify-between items-center p-4">
                    <span className="text-[#c1c6d5] text-xs font-bold">Tipo</span>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryColors[activeTx.category] || '#c1c6d5' }} />
                      <span className="text-white text-xs font-bold">{categoryLabels[activeTx.category] || activeTx.category}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-4">
                    <span className="text-[#c1c6d5] text-xs font-bold">Fecha</span>
                    <span className="text-white text-xs font-bold">{activeTx.date}</span>
                  </div>
                  <div className="flex justify-between items-center p-4">
                    <span className="text-[#c1c6d5] text-xs font-bold">Monto</span>
                    <span className={`text-xs font-black tabular-nums ${activeTx.type === 'credit' ? 'text-[#77ff61]' : 'text-[#ffb4ab]'}`}>
                      {activeTx.type === 'credit' ? '+' : ''}{Math.abs(activeTx.amount).toLocaleString()} 🪙
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4">
                    <span className="text-[#c1c6d5] text-xs font-bold">ID Transacción</span>
                    <span className="text-[#aac7ff] text-xs font-mono font-bold">{activeTx.id.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between items-center p-4">
                    <span className="text-[#c1c6d5] text-xs font-bold">Estado</span>
                    <span className="bg-[#77ff61]/10 text-[#77ff61] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                      Completada
                    </span>
                  </div>
                </div>

                {/* Category-specific info */}
                {activeTx.category === 'prediction_submit' && (
                  <div className="bg-[#1a2c39] rounded-xl p-4 flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#aac7ff] mt-0.5">info</span>
                    <div>
                      <p className="text-white text-xs font-bold mb-0.5">Pronóstico en curso</p>
                      <p className="text-[#c1c6d5] text-[10px] leading-relaxed">
                        Si tu predicción es correcta, recibirás el beneficio estimado. Los multiplicadores se congelaron al momento de este pronóstico.
                      </p>
                    </div>
                  </div>
                )}
                {activeTx.category === 'topup' && (
                  <div className="bg-[#1a2c39] rounded-xl p-4 flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#00e601] mt-0.5">verified</span>
                    <div>
                      <p className="text-white text-xs font-bold mb-0.5">Recarga verificada</p>
                      <p className="text-[#c1c6d5] text-[10px] leading-relaxed">
                        Tu recarga fue procesada exitosamente. Los 🪙 CL COINS ya están disponibles en tu balance.
                      </p>
                    </div>
                  </div>
                )}
                {activeTx.category === 'bonus' && (
                  <div className="bg-[#1a2c39] rounded-xl p-4 flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#ffc107] mt-0.5">celebration</span>
                    <div>
                      <p className="text-white text-xs font-bold mb-0.5">Bonificación otorgada</p>
                      <p className="text-[#c1c6d5] text-[10px] leading-relaxed">
                        Este bonus fue acreditado automáticamente por cumplir con los requisitos de la promoción.
                      </p>
                    </div>
                  </div>
                )}
                {activeTx.category === 'early_return' && (
                  <div className="bg-[#1a2c39] rounded-xl p-4 flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#1475e1] mt-0.5">account_balance_wallet</span>
                    <div>
                      <p className="text-white text-xs font-bold mb-0.5">Retiro Anticipado procesado</p>
                      <p className="text-[#c1c6d5] text-[10px] leading-relaxed">
                        Retiraste tu pronóstico anticipadamente. El monto fue acreditado a tu balance.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
