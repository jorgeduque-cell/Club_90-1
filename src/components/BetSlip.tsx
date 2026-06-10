// ============================================
// CLUB PYP — PredictionSlip (CONTEXTO §8 Compliant)
// ============================================
// Quick Stakes: [+500], [+1K], [MAX]
// MAX = 2,000 PyP (NEVER full balance)

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitTicketRPC, useIsLive } from '../hooks/useSupabaseData';
import { useAppStore, MAX_STAKE } from '../stores/appStore';
import { useAuth } from '../context/AuthContext';

export default function BetSlip() {
  const navigate = useNavigate();
  const predictionSlipOpen = useAppStore((s) => s.predictionSlipOpen);
  const selection = useAppStore((s) => s.predictionSlipSelection);
  const closePredictionSlip = useAppStore((s) => s.closePredictionSlip);
  const demoSubmitPrediction = useAppStore((s) => s.submitPrediction);
  const demoBalance = useAppStore((s) => s.balance);
  const addToast = useAppStore((s) => s.addToast);
  const live = useIsLive();
  const { profile, refreshProfile } = useAuth();
  const balance = live && profile ? profile.clCoins : demoBalance;

  const [amount, setAmount] = useState('500');
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selection) {
      setAmount('500');
      setConfirming(false);
    }
  }, [selection]);

  if (!predictionSlipOpen || !selection) return null;

  const numAmount = parseInt(amount || '0', 10);
  const estimatedReturn = (numAmount * selection.multiplier).toFixed(2);
  const effectiveMax = Math.min(MAX_STAKE, balance);
  const isValid = numAmount > 0 && numAmount <= balance && numAmount <= MAX_STAKE;

  async function handlePlace() {
    if (!isValid || loading) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }

    if (live) {
      // Real bet via Supabase RPC
      setLoading(true);
      try {
        const result = await submitTicketRPC([{matchMarketId: selection!.matchId, outcome: selection!.prediction}], numAmount);
        addToast('success', `Pronóstico de ${numAmount.toLocaleString()} 🪙 realizado a factor (multiplicador) ${result.potentialReturn / numAmount}`);
        closePredictionSlip();
        refreshProfile();
      } catch (err: any) {
        addToast('error', err.message || 'Error al pronosticar');
      } finally {
        setLoading(false);
        setConfirming(false);
      }
    } else {
      // Demo mode
      demoSubmitPrediction(selection!.matchId, selection!.prediction, numAmount);
      setConfirming(false);
    }
  }

  // §8: Quick Stakes [+500], [+1K], [MAX=2000]
  function handleQuickStake(type: '500' | '1000' | 'max') {
    if (type === '500') setAmount(String(Math.min(500, effectiveMax)));
    else if (type === '1000') setAmount(String(Math.min(1000, effectiveMax)));
    else setAmount(String(effectiveMax));
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[55] transition-opacity"
        onClick={() => { closePredictionSlip(); setConfirming(false); }}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-[60] transform transition-transform duration-300">
        <div className="bg-[#1c1610] rounded-t-2xl shadow-[0_-12px_40px_rgba(0,0,0,0.6)] border-t border-[#2e2418]">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-[#4a3f2c] rounded-full" />
          </div>

          <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-2 h-6 bg-[#e5b85c] rounded-full" />
                <h4 className="font-black text-white uppercase text-sm italic tracking-tight">Boleto Sencillo</h4>
              </div>
              <button
                onClick={() => { closePredictionSlip(); setConfirming(false); }}
                className="text-[#b8a98a] hover:text-white transition-colors p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Selection */}
            <div className="bg-[#140f0a] p-4 rounded-xl border-l-4 border-[#e5b85c]">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <span className="text-white font-bold text-sm">{selection.predictionLabel}</span>
                  <p className="text-[#b8a98a] text-[11px] mt-0.5">{selection.matchLabel}</p>
                </div>
                <span className="text-[#e5b85c] font-black text-xl tabular-nums">{selection.multiplier.toFixed(2)}</span>
              </div>

              {/* Amount Input + Quick Stakes (Only for PREMIUM or demo) */}
              {(!live || profile?.accountTier === 'PREMIUM') ? (
                <div className="flex items-center gap-2 mt-4">
                  <div className="flex-1 relative">
                    <input
                      className="w-full bg-[#1c1610] border border-[#4a3f2c]/30 rounded-lg py-3.5 pl-4 pr-12 text-white font-bold focus:ring-1 focus:ring-[#e5b85c]/40 focus:border-[#e5b85c]/40 text-lg outline-none tabular-nums"
                      placeholder="Monto"
                      type="text"
                      inputMode="numeric"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#c2b391] uppercase">PyP</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleQuickStake('500')}
                      className="bg-[#2e2418] text-[#b8a98a] px-2 py-3.5 rounded-lg text-[10px] font-bold hover:text-white hover:bg-[#3a2d1c] transition-colors active:scale-95"
                    >
                      +500
                    </button>
                    <button
                      onClick={() => handleQuickStake('1000')}
                      className="bg-[#2e2418] text-[#b8a98a] px-2 py-3.5 rounded-lg text-[10px] font-bold hover:text-white hover:bg-[#3a2d1c] transition-colors active:scale-95"
                    >
                      +1K
                    </button>
                    <button
                      onClick={() => handleQuickStake('max')}
                      className="bg-[#e5b85c]/20 text-[#e5b85c] px-2.5 py-3.5 rounded-lg text-[10px] font-black hover:bg-[#e5b85c]/30 transition-colors active:scale-95"
                    >
                      MAX
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 bg-[#1c1610]/50 border border-[#ffd700]/30 rounded-lg p-3 text-center">
                  <span className="material-symbols-outlined text-[#ffd700] text-3xl mb-1 drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]">lock</span>
                  <p className="text-white text-xs font-bold uppercase tracking-widest">Acceso Bloqueado</p>
                  <p className="text-[#b8a98a] text-[9px] mt-1 px-4">Necesitas el Pase Premium para realizar pronósticos.</p>
                </div>
              )}

              {/* Warnings (Only if Premium) */}
              {(!live || profile?.accountTier === 'PREMIUM') && (
                <>
                  {numAmount > MAX_STAKE && (
                    <p className="text-[#ffb4ab] text-[10px] font-bold mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">warning</span>
                      Máximo {MAX_STAKE.toLocaleString()} 🪙 por pronóstico
                    </p>
                  )}
                  {numAmount > balance && numAmount <= MAX_STAKE && (
                    <p className="text-[#ffb4ab] text-[10px] font-bold mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">warning</span>
                      Saldo insuficiente ({balance.toLocaleString()} 🪙 disponibles)
                    </p>
                  )}
                  {numAmount > 0 && isValid && (
                    <p className="text-[#c2b391] text-[9px] mt-2 opacity-60">
                      Límite por pronóstico: {MAX_STAKE.toLocaleString()} 🪙
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Estimated Return */}
            <div className="flex justify-between items-center px-1 mt-2">
              <span className="text-[#b8a98a] text-[11px] font-bold uppercase tracking-widest">
                {(!live || profile?.accountTier === 'PREMIUM') ? 'Beneficio Estimado' : 'Beneficio si fueras Premium'}
              </span>
              <span className="text-[#e5b85c] font-black text-2xl tracking-tighter tabular-nums drop-shadow-[0_0_8px_rgba(0,230,1,0.2)]">
                {(!live || profile?.accountTier === 'PREMIUM') ? estimatedReturn : (500 * selection.multiplier).toFixed(2)} 🪙
              </span>
            </div>

            <p className="text-[#b8a98a] text-[9px] leading-relaxed opacity-60">
              Multiplicadores Fijos: El factor se congela al pronosticar. Si tu predicción es correcta, se te paga exacto ese multiplicador.
            </p>

            {/* Action Button */}
            {live && profile?.accountTier === 'GUEST' ? (
              <button
                onClick={() => { closePredictionSlip(); navigate('/profile'); }}
                className="w-full font-black text-xs py-4 rounded-xl uppercase tracking-widest transition-all duration-200 bg-gradient-to-r from-[#ffd700] to-[#ffa500] text-black shadow-[0_4px_20px_rgba(255,215,0,0.3)] active:scale-95 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">workspace_premium</span>
                Adquirir Pase Premium
              </button>
            ) : (
              <button
                onClick={handlePlace}
                disabled={!isValid}
                className={`w-full font-black text-base py-4 rounded-xl uppercase tracking-widest transition-all duration-200 shadow-lg ${
                  !isValid
                    ? 'bg-[#2e2418] text-[#c2b391]/50 cursor-not-allowed shadow-none'
                    : confirming
                    ? 'bg-[#ff9800] text-[#140f0a] active:scale-[0.98] shadow-[0_4px_16px_rgba(255,152,0,0.3)] animate-pulse'
                    : 'bg-[#e5b85c] text-[#140f0a] active:scale-[0.98] shadow-[0_4px_16px_rgba(0,230,1,0.3)]'
                }`}
              >
                {loading ? '⏳ Procesando...' : confirming ? '¿Confirmar Pronóstico?' : `Pronosticar ${numAmount > 0 ? numAmount.toLocaleString() : ''} 🪙`}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
