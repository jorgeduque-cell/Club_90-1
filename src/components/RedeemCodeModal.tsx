// ============================================
// CLUB PYP — Modal de Canje de Código (Cliente)
// ============================================
// Reemplaza el flujo predatorio de "comprar monedas" (PLAN_MUNDIAL §0 líneas rojas).
// El cliente consumió producto real → el cajero le dio un código de 6 dígitos →
// aquí lo canjea y RECIBE sus PyP Coins (cashback gamificado, nunca compra).

import { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { useIsLive } from '../hooks/useSupabaseData';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function RedeemCodeModal() {
  const isOpen = useAppStore((s) => s.redeemModalOpen);
  const closeModal = useAppStore((s) => s.closeRedeemModal);
  const addToast = useAppStore((s) => s.addToast);
  const live = useIsLive();
  const { refreshProfile } = useAuth();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ coins: number; balance: number } | null>(null);

  if (!isOpen) return null;

  function handleClose() {
    closeModal();
    setCode('');
    setError(null);
    setSuccess(null);
    setLoading(false);
  }

  async function handleRedeem() {
    setError(null);

    const clean = code.replace(/\D/g, '');
    if (clean.length !== 6) {
      setError('El código debe tener 6 dígitos');
      return;
    }

    if (!live) {
      setError('El canje de códigos requiere conexión. Inicia sesión para usarlo.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('redeem_emission_code', {
        p_code: clean,
      });
      if (rpcError) throw rpcError;

      const result = Array.isArray(data) ? data[0] : data;
      if (!result || !result.success) {
        throw new Error(result?.message || 'No se pudo canjear el código');
      }

      setSuccess({ coins: result.coinsAdded, balance: result.newBalance });
      addToast('success', `🪙 +${Number(result.coinsAdded).toLocaleString()} PyP Coins`);
      await refreshProfile();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al canjear el código';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-[70] backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-[75] max-h-[90vh] overflow-y-auto">
        <div className="bg-[#181817] rounded-t-2xl shadow-[0_-20px_60px_rgba(0,0,0,0.8)] border-t border-[#2e2c29]">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-[#4c4843] rounded-full" />
          </div>

          <div className="p-5 space-y-5">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-white font-black text-lg uppercase tracking-tight">Canjear Código</h3>
                <p className="text-[#c2b391] text-[10px] font-bold uppercase tracking-widest">
                  Tus PyP Coins por tu consumo
                </p>
              </div>
              <button onClick={handleClose} className="text-[#b8a98a] hover:text-white transition-colors p-1" aria-label="Cerrar">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {success ? (
              /* ── Éxito ── */
              <div className="space-y-5 text-center py-2">
                <div className="mx-auto w-16 h-16 rounded-full bg-[#e5b85c]/15 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#e5b85c] text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                </div>
                <div>
                  <p className="text-[#e5b85c] text-4xl font-black tabular-nums">+{success.coins.toLocaleString()} 🪙</p>
                  <p className="text-[#c2b391] text-xs font-bold mt-1">PyP Coins acreditadas</p>
                </div>
                <div className="bg-[#1f1e1c] rounded-xl p-4 flex justify-between items-center">
                  <span className="text-[#c2b391] text-xs font-bold uppercase tracking-widest">Nuevo balance</span>
                  <span className="text-white font-black text-lg tabular-nums">{success.balance.toLocaleString()} 🪙</span>
                </div>
                <button
                  onClick={handleClose}
                  className="w-full bg-[#d72a22] text-white py-4 rounded-xl font-black text-base uppercase tracking-widest active:scale-[0.98] transition-all"
                >
                  Listo
                </button>
              </div>
            ) : (
              /* ── Entrada de código ── */
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-[#1f1e1c] to-[#2e2c29] rounded-xl p-5 border border-[#d72a22]/20 text-center space-y-3">
                  <span className="material-symbols-outlined text-[#f0d9a8] text-3xl">confirmation_number</span>
                  <p className="text-[#efe6d2] text-xs leading-relaxed">
                    Pídele al cajero el código de 6 dígitos por tu consumo y digítalo aquí.
                    Vence a los 10 minutos de generado.
                  </p>
                </div>

                <input
                  inputMode="numeric"
                  autoFocus
                  maxLength={6}
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRedeem(); }}
                  placeholder="000000"
                  className="w-full bg-[#1f1e1c] border border-[#2e2c29] rounded-xl py-4 text-center text-white text-3xl font-black tracking-[0.4em] tabular-nums placeholder:text-[#4c4843] focus:outline-none focus:border-[#d72a22]"
                />

                {error && (
                  <div className="bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 rounded-xl p-3 text-center">
                    <p className="text-[#ffb4ab] text-xs font-bold">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleRedeem}
                  disabled={loading || code.length !== 6}
                  className="w-full bg-[#d72a22] text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 shadow-[0_4px_16px_rgba(215,42,34,0.3)] transition-all"
                >
                  {loading ? 'Canjeando…' : 'Canjear PyP Coins'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}