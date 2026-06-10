// ============================================
// CLUB PYP — Pantalla de Cajero (Emisión de PyP Coins)
// ============================================
// PLAN_MUNDIAL §2 "SE RECABLEA": reemplaza el OCR. El cajero (rol CASHIER) digita
// el monto de venta real → el sistema genera un código de 6 dígitos (vence 10 min)
// → el cliente lo canjea en su app. NO acredita monedas aquí (eso pasa al canjear).

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useIsLive } from '../hooks/useSupabaseData';
import { supabase } from '../lib/supabase';

// Emisión: 10 COINS / 1.000 COP  →  1 COIN = 100 COP (PLAN_MUNDIAL §1)
const COP_PER_COIN = 100;

interface ActiveCode {
  code: string;
  coinsValue: number;
  amountCOP: number;
  expiresAt: string;
}

interface RecentCode {
  id: string;
  code: string;
  coinsValue: number;
  status: 'PENDING' | 'REDEEMED' | 'EXPIRED';
  createdAt: string;
}

export default function CashierPage() {
  const { profile, loading: authLoading } = useAuth();
  const live = useIsLive();

  const [amount, setAmount] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<ActiveCode | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [recent, setRecent] = useState<RecentCode[]>([]);

  const isAuthorized = !!profile && (profile.role === 'CASHIER' || profile.role === 'ADMIN');
  const amountCOP = Number(amount.replace(/\D/g, '')) || 0;
  const coinsPreview = Math.floor(amountCOP / COP_PER_COIN);

  // ── Cargar códigos recientes del cajero ──
  const loadRecent = useCallback(async () => {
    if (!live || !isAuthorized) return;
    const { data } = await supabase
      .from('emission_codes')
      .select('id, code, coinsValue, status, createdAt')
      .order('createdAt', { ascending: false })
      .limit(8);
    if (data) setRecent(data as RecentCode[]);
  }, [live, isAuthorized]);

  useEffect(() => { loadRecent(); }, [loadRecent]);

  // ── Countdown del código activo ──
  useEffect(() => {
    if (!active) return;
    const tick = () => {
      // El servidor devuelve expiresAt en UTC naive (sin zona horaria);
      // lo forzamos a UTC para que el navegador no lo lea como hora local.
      const raw = active.expiresAt;
      const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(raw);
      const iso = raw.replace(' ', 'T') + (hasTz ? '' : 'Z');
      const remaining = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) { setActive(null); loadRecent(); }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active, loadRecent]);

  async function handleGenerate() {
    setError(null);
    if (amountCOP <= 0) { setError('Digita el monto de la venta'); return; }
    if (coinsPreview < 1) { setError('La venta es muy pequeña (mínimo $100 COP)'); return; }

    setGenerating(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('create_emission_code', {
        p_amount_cop: amountCOP,
      });
      if (rpcError) throw rpcError;

      setActive({
        code: data.code,
        coinsValue: data.coinsValue,
        amountCOP: data.amountCOP,
        expiresAt: data.expiresAt,
      });
      setAmount('');
      loadRecent();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al generar el código');
    } finally {
      setGenerating(false);
    }
  }

  // ── Guards ──
  if (authLoading) {
    return <div className="p-4 flex justify-center items-center h-[50vh]"><div className="spinner__circle" /></div>;
  }
  if (!live) {
    return (
      <div className="p-6 text-center space-y-3 mt-10">
        <span className="material-symbols-outlined text-[#ffb4ab] text-4xl">cloud_off</span>
        <p className="text-[#efe6d2] text-sm font-bold">El módulo de cajero requiere conexión.</p>
      </div>
    );
  }
  if (!isAuthorized) {
    return (
      <div className="p-6 text-center space-y-3 mt-10">
        <span className="material-symbols-outlined text-[#ffb4ab] text-4xl">lock</span>
        <p className="text-[#efe6d2] text-sm font-bold">No autorizado.</p>
        <p className="text-[#c2b391] text-xs">Esta pantalla es solo para cajeros.</p>
      </div>
    );
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="p-4 space-y-5 max-w-md mx-auto">
      <div>
        <h2 className="text-white font-black text-xl uppercase tracking-tight">Caja — Emitir PyP Coins</h2>
        <p className="text-[#c2b391] text-xs">Digita el monto de la venta del cliente.</p>
      </div>

      {active ? (
        /* ── Código activo ── */
        <div className="bg-gradient-to-br from-[#1f1e1c] to-[#2e2c29] rounded-2xl p-6 border border-[#e5b85c]/30 text-center space-y-4">
          <p className="text-[9px] font-black text-[#c2b391] uppercase tracking-[0.2em]">Código para el cliente</p>
          <p className="text-[#e5b85c] text-5xl font-black tracking-[0.2em] tabular-nums">{active.code}</p>
          <div className="flex justify-center gap-6 text-sm">
            <div>
              <p className="text-[#c2b391] text-[10px] uppercase tracking-widest font-bold">Vale</p>
              <p className="text-white font-black tabular-nums">{active.coinsValue.toLocaleString()} 🪙</p>
            </div>
            <div>
              <p className="text-[#c2b391] text-[10px] uppercase tracking-widest font-bold">Vence en</p>
              <p className={`font-black tabular-nums ${secondsLeft < 60 ? 'text-[#ffb4ab]' : 'text-white'}`}>{mm}:{ss}</p>
            </div>
          </div>
          <button
            onClick={() => setActive(null)}
            className="w-full bg-[#d72a22] text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-widest active:scale-[0.98] transition-all"
          >
            Emitir otro código
          </button>
        </div>
      ) : (
        /* ── Formulario de emisión ── */
        <div className="space-y-4">
          <div>
            <label className="text-[9px] font-black text-[#c2b391] uppercase tracking-[0.2em] px-1">Monto de venta (COP)</label>
            <div className="relative mt-1.5">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#c2b391] font-black text-xl">$</span>
              <input
                inputMode="numeric"
                autoFocus
                value={amountCOP ? amountCOP.toLocaleString('es-CO') : ''}
                onChange={(e) => { setAmount(e.target.value); setError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate(); }}
                placeholder="0"
                className="w-full bg-[#1f1e1c] border border-[#2e2c29] rounded-xl py-4 pl-9 pr-4 text-white text-2xl font-black tabular-nums placeholder:text-[#4c4843] focus:outline-none focus:border-[#d72a22]"
              />
            </div>
          </div>

          <div className="bg-[#1f1e1c] rounded-xl p-4 flex justify-between items-center">
            <span className="text-[#c2b391] text-xs font-bold uppercase tracking-widest">El cliente recibe</span>
            <span className="text-[#e5b85c] font-black text-xl tabular-nums">{coinsPreview.toLocaleString()} 🪙</span>
          </div>

          {error && (
            <div className="bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 rounded-xl p-3 text-center">
              <p className="text-[#ffb4ab] text-xs font-bold">{error}</p>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating || coinsPreview < 1}
            className="w-full bg-[#d72a22] text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 shadow-[0_4px_16px_rgba(215,42,34,0.3)] transition-all"
          >
            {generating ? 'Generando…' : 'Generar código'}
          </button>
        </div>
      )}

      {/* ── Recientes ── */}
      {recent.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] font-black text-[#c2b391] uppercase tracking-[0.2em] px-1">Últimos códigos</p>
          {recent.map((c) => (
            <div key={c.id} className="bg-[#1f1e1c] rounded-lg p-3 flex items-center justify-between">
              <span className="text-[#efe6d2] font-black tabular-nums tracking-widest">{c.code}</span>
              <span className="text-[#c2b391] text-xs tabular-nums">{c.coinsValue.toLocaleString()} 🪙</span>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                c.status === 'REDEEMED' ? 'bg-[#e5b85c]/15 text-[#f2d27a]'
                : c.status === 'PENDING' ? 'bg-[#d72a22]/15 text-[#f0d9a8]'
                : 'bg-[#ffb4ab]/10 text-[#ffb4ab]'
              }`}>
                {c.status === 'REDEEMED' ? 'Canjeado' : c.status === 'PENDING' ? 'Activo' : 'Vencido'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}