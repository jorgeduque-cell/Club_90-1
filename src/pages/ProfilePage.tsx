import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppStore, Transaction } from '../stores/appStore';
import { useIsLive, useMyTickets, useTransactions } from '../hooks/useSupabaseData';
import { useMonthlyStatus } from '../lib/status';

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
  const openRedeemModal = useAppStore((s) => s.openRedeemModal);
  const openRewardsModal = useAppStore((s) => s.openRewardsModal);
  const openRulesModal = useAppStore((s) => s.openRulesModal);
  const openPrizesModal = useAppStore((s) => s.openPrizesModal);
  const selectedTransaction = useAppStore((s) => s.selectedTransaction);
  const openTransactionDetail = useAppStore((s) => s.openTransactionDetail);
  const closeTransactionDetail = useAppStore((s) => s.closeTransactionDetail);

  const live = useIsLive();
  const { tickets: supaTickets } = useMyTickets();
  const { transactions: supaTxns } = useTransactions();
  const status = useMonthlyStatus();

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
    prediction_win: '#f2d27a',
    prediction_submit: '#f0d9a8',
    bonus: '#ffc107',
    early_return: '#d72a22',
    redeem: '#9c27b0',
    topup: '#e5b85c',
  };

  return (
    <main className="pt-4 pb-24 px-4 max-w-md mx-auto space-y-4">
      {/* Balance Hero */}
      <section className="bg-[#1f1e1c] rounded-xl p-5 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#d72a22]/10 rounded-full blur-3xl pointer-events-none" />
        <img
          src="/logo_dorado_sin_fondo.png"
          alt=""
          aria-hidden
          className="absolute -right-4 -bottom-6 h-44 opacity-10 pointer-events-none select-none"
        />
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-[#c2b391] text-[10px] font-bold uppercase tracking-widest mb-1">Total Balance</p>
            <h2 className="text-[#e5b85c] text-4xl font-extrabold tracking-tighter neon-glow tabular-nums">
              {balance.toLocaleString()}{' '}
              <span className="text-lg text-[#c2b391] font-black uppercase">PyP Coins</span>
            </h2>
            <p className="text-[#c2b391] text-[11px] mt-1 font-medium">{userName}</p>
          </div>
          <div
            className="border px-3 py-1 rounded-full flex items-center gap-1.5"
            style={{ backgroundColor: `${status.tier.color}22`, borderColor: `${status.tier.color}44`, color: status.tier.color }}
          >
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              {status.tier.icon}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider">{status.tier.name}</span>
          </div>
        </div>

        {/* Canjear código de consumo */}
        <button
          onClick={openRedeemModal}
          className="w-full bg-[#d72a22] text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(215,42,34,0.25)] mb-4"
        >
          <span className="material-symbols-outlined text-lg">confirmation_number</span>
          Canjear código de consumo
        </button>

        {/* Progress Bar — only show in demo mode */}
        {!live && (
          <div className="space-y-2">
            <div className="flex justify-between items-end text-[10px] font-bold uppercase tracking-wider">
              <span className="text-[#c2b391]">Progreso a Platinum</span>
              <span className="text-white tabular-nums">{xp.toLocaleString()} / {xpToNext.toLocaleString()} XP</span>
            </div>
            <div className="h-2.5 w-full bg-[#2e2c29] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#d72a22] to-[#f0d9a8] rounded-full transition-all duration-700 relative"
                style={{ width: `${xpPercent}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>
            <p className="text-[#c2b391] text-[10px] italic">{(xpToNext - xp).toLocaleString()} puntos hasta tu próxima recompensa</p>
          </div>
        )}
      </section>

      {/* Estatus del Mes — programa de lealtad por consumo */}
      <section className="bg-gradient-to-br from-[#1f1e1c] to-[#262422] rounded-xl p-5 relative overflow-hidden border" style={{ borderColor: `${status.tier.color}33` }}>
        <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: `${status.tier.color}1a` }} />
        <p className="text-[#c2b391] text-[10px] font-bold uppercase tracking-widest mb-2">Tu estatus del mes</p>
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-4xl" style={{ color: status.tier.color, fontVariationSettings: "'FILL' 1" }}>
            {status.tier.icon}
          </span>
          <h3 className="text-4xl font-black uppercase tracking-tighter" style={{ color: status.tier.color }}>
            {status.tier.name}
          </h3>
        </div>
        {status.next ? (
          <div className="space-y-2">
            <div className="flex justify-between items-end text-[10px] font-bold uppercase tracking-wider">
              <span className="text-[#c2b391]">Consumo del mes: ${status.monthlyCOP.toLocaleString('es-CO')}</span>
              <span className="text-white tabular-nums">{status.progress}%</span>
            </div>
            <div className="h-2.5 w-full bg-[#2e2c29] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${status.progress}%`, background: `linear-gradient(to right, ${status.tier.color}, ${status.next.color})` }}
              />
            </div>
            <p className="text-[#c2b391] text-[10px] italic">
              Te faltan ${Math.max(0, status.next.minCOP - status.monthlyCOP).toLocaleString('es-CO')} en consumo para ser{' '}
              <span className="font-bold" style={{ color: status.next.color }}>{status.next.name}</span>
            </p>
          </div>
        ) : (
          <p className="text-[#c2b391] text-[10px] italic">
            Nivel máximo del club. Consumo del mes: ${status.monthlyCOP.toLocaleString('es-CO')} 👑
          </p>
        )}
      </section>

      {/* Quick Stats */}
      <section className="grid grid-cols-3 gap-2">
        <div className="bg-[#1f1e1c] rounded-xl p-3 text-center">
          <p className="text-[#c2b391] text-[9px] font-bold uppercase tracking-widest">Pronósticos</p>
          <p className="text-white font-black text-xl tabular-nums">{totalBets}</p>
        </div>
        <div className="bg-[#1f1e1c] rounded-xl p-3 text-center">
          <p className="text-[#c2b391] text-[9px] font-bold uppercase tracking-widest">Ganadas</p>
          <p className="text-[#f2d27a] font-black text-xl tabular-nums">{wonBets}</p>
        </div>
        <div className="bg-[#1f1e1c] rounded-xl p-3 text-center">
          <p className="text-[#c2b391] text-[9px] font-bold uppercase tracking-widest">Win Rate</p>
          <p className="text-[#f0d9a8] font-black text-xl tabular-nums">{winRate}%</p>
        </div>
      </section>

      {/* Action Buttons */}
      <section className="grid grid-cols-1 gap-2">
        <button
          onClick={openRewardsModal}
          className="bg-[#1f1e1c] text-[#efe6d2] h-16 rounded-xl flex items-center justify-between px-4 hover:bg-[#2e2c29] transition-all active:scale-[0.98] group border border-[#2e2c29]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e5b85c]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#e5b85c]">redeem</span>
            </div>
            <div className="text-left">
              <span className="font-bold text-sm text-white">Recompensas Semanales</span>
              <p className="text-[9px] text-[#c2b391] font-bold">Reclama tus premios de esta jornada</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-[#4c4843] group-hover:text-[#c2b391] transition-colors">chevron_right</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={openRulesModal}
            className="bg-[#1f1e1c] text-[#efe6d2] h-14 rounded-xl flex items-center justify-center gap-2 hover:bg-[#2e2c29] transition-colors active:scale-[0.98] border border-[#2e2c29]"
          >
            <span className="material-symbols-outlined text-[#f0d9a8]">menu_book</span>
            <span className="font-bold uppercase tracking-widest text-[10px]">Reglas</span>
          </button>
          <button
            onClick={openPrizesModal}
            className="bg-[#1f1e1c] text-[#efe6d2] h-14 rounded-xl flex items-center justify-center gap-2 hover:bg-[#2e2c29] transition-colors active:scale-[0.98] border border-[#2e2c29]"
          >
            <span className="material-symbols-outlined text-[#ffd700]">emoji_events</span>
            <span className="font-bold uppercase tracking-widest text-[10px]">Premios</span>
          </button>
        </div>
      </section>

      {/* Transaction History */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[#efe6d2] font-extrabold text-sm uppercase tracking-widest">Historial</h3>
          <span className="text-[#b8a98a] text-[10px] font-bold tabular-nums">{transactions.length} transacciones</span>
        </div>

        {transactions.length === 0 ? (
          <div className="bg-[#181817] rounded-xl p-8 text-center">
            <span className="material-symbols-outlined text-3xl text-[#4c4843] mb-2">receipt_long</span>
            <p className="text-[#c2b391] text-sm">Sin transacciones aún</p>
          </div>
        ) : (
          <div className="bg-[#181817] rounded-xl overflow-hidden">
            {transactions.slice(0, 15).map((tx) => (
              <button
                key={tx.id}
                onClick={() => openTransactionDetail(tx.id)}
                className="w-full flex items-center justify-between p-4 border-b border-[#4c4843]/15 last:border-0 hover:bg-[#1f1e1c] transition-colors active:bg-[#2e2c29] text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    tx.type === 'credit' ? 'bg-[#f2d27a]/10 text-[#f2d27a]' : 'bg-[#d72a22]/10 text-[#f0d9a8]'
                  }`}>
                    <span className="material-symbols-outlined">{tx.icon}</span>
                  </div>
                  <div>
                    <p className="text-white text-xs font-bold">{tx.label}</p>
                    <p className="text-[#c2b391] text-[10px]">{tx.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className={`font-extrabold text-sm tabular-nums ${tx.type === 'credit' ? 'text-[#f2d27a]' : 'text-white'}`}>
                    {tx.amountLabel}
                  </p>
                  <span className="material-symbols-outlined text-[#4c4843] text-sm">chevron_right</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Promo Card */}
      <button
        onClick={openPrizesModal}
        className="w-full relative bg-[#1f1e1c] rounded-xl p-4 border-l-4 border-[#d72a22] overflow-hidden text-left hover:bg-[#2e2c29] transition-colors active:scale-[0.99] group"
      >
        <div className="relative z-10 flex gap-4 items-center">
          <div className="flex-1">
            <h4 className="text-white font-bold text-xs mb-1">¡Premios de Fin de Temporada!</h4>
            <p className="text-[#c2b391] text-[10px] leading-relaxed">
              Top 3 del ranking ganan premios reales. Toca para ver los detalles.
            </p>
          </div>
          <div className="bg-[#f0d9a8]/20 p-2.5 rounded-xl group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[#f0d9a8]">emoji_events</span>
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
            <div className="bg-[#181817] rounded-t-2xl shadow-2xl border-t border-[#2e2c29]">
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-[#4c4843] rounded-full" />
              </div>
              <div className="p-5 space-y-5">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      activeTx.type === 'credit' ? 'bg-[#f2d27a]/15 text-[#f2d27a]' : 'bg-[#d72a22]/15 text-[#f0d9a8]'
                    }`}>
                      <span className="material-symbols-outlined text-2xl">{activeTx.icon}</span>
                    </div>
                    <div>
                      <h3 className="text-white font-black text-base">{activeTx.label}</h3>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        activeTx.type === 'credit' ? 'bg-[#f2d27a]/10 text-[#f2d27a]' : 'bg-[#f0d9a8]/10 text-[#f0d9a8]'
                      }`}>
                        {activeTx.type === 'credit' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </div>
                  </div>
                  <button onClick={closeTransactionDetail} className="text-[#b8a98a] hover:text-white p-1">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                {/* Amount Hero */}
                <div className="text-center py-3">
                  <p className={`text-4xl font-black tabular-nums tracking-tighter ${
                    activeTx.type === 'credit' ? 'text-[#e5b85c]' : 'text-white'
                  }`}>
                    {activeTx.amountLabel}
                  </p>
                  <p className="text-[#c2b391] text-[10px] font-bold uppercase tracking-widest mt-1">🪙 PyP Coins</p>
                </div>

                {/* Details Grid */}
                <div className="bg-[#1f1e1c] rounded-xl divide-y divide-[#4c4843]/15">
                  <div className="flex justify-between items-center p-4">
                    <span className="text-[#c2b391] text-xs font-bold">Tipo</span>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryColors[activeTx.category] || '#c2b391' }} />
                      <span className="text-white text-xs font-bold">{categoryLabels[activeTx.category] || activeTx.category}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-4">
                    <span className="text-[#c2b391] text-xs font-bold">Fecha</span>
                    <span className="text-white text-xs font-bold">{activeTx.date}</span>
                  </div>
                  <div className="flex justify-between items-center p-4">
                    <span className="text-[#c2b391] text-xs font-bold">Monto</span>
                    <span className={`text-xs font-black tabular-nums ${activeTx.type === 'credit' ? 'text-[#f2d27a]' : 'text-[#ffb4ab]'}`}>
                      {activeTx.type === 'credit' ? '+' : ''}{Math.abs(activeTx.amount).toLocaleString()} 🪙
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4">
                    <span className="text-[#c2b391] text-xs font-bold">ID Transacción</span>
                    <span className="text-[#f0d9a8] text-xs font-mono font-bold">{activeTx.id.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between items-center p-4">
                    <span className="text-[#c2b391] text-xs font-bold">Estado</span>
                    <span className="bg-[#f2d27a]/10 text-[#f2d27a] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                      Completada
                    </span>
                  </div>
                </div>

                {/* Category-specific info */}
                {activeTx.category === 'prediction_submit' && (
                  <div className="bg-[#1f1e1c] rounded-xl p-4 flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#f0d9a8] mt-0.5">info</span>
                    <div>
                      <p className="text-white text-xs font-bold mb-0.5">Pronóstico en curso</p>
                      <p className="text-[#c2b391] text-[10px] leading-relaxed">
                        Si tu predicción es correcta, recibirás el beneficio estimado. Los multiplicadores se congelaron al momento de este pronóstico.
                      </p>
                    </div>
                  </div>
                )}
                {activeTx.category === 'topup' && (
                  <div className="bg-[#1f1e1c] rounded-xl p-4 flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#e5b85c] mt-0.5">verified</span>
                    <div>
                      <p className="text-white text-xs font-bold mb-0.5">Recarga verificada</p>
                      <p className="text-[#c2b391] text-[10px] leading-relaxed">
                        Tu recarga fue procesada exitosamente. Los 🪙 PyP Coins ya están disponibles en tu balance.
                      </p>
                    </div>
                  </div>
                )}
                {activeTx.category === 'bonus' && (
                  <div className="bg-[#1f1e1c] rounded-xl p-4 flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#ffc107] mt-0.5">celebration</span>
                    <div>
                      <p className="text-white text-xs font-bold mb-0.5">Bonificación otorgada</p>
                      <p className="text-[#c2b391] text-[10px] leading-relaxed">
                        Este bonus fue acreditado automáticamente por cumplir con los requisitos de la promoción.
                      </p>
                    </div>
                  </div>
                )}
                {activeTx.category === 'early_return' && (
                  <div className="bg-[#1f1e1c] rounded-xl p-4 flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#d72a22] mt-0.5">account_balance_wallet</span>
                    <div>
                      <p className="text-white text-xs font-bold mb-0.5">Retiro Anticipado procesado</p>
                      <p className="text-[#c2b391] text-[10px] leading-relaxed">
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
