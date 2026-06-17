// ============================================
// CLUB PYP — Botón de activar notificaciones (Perfil)
// ============================================
// Solo se muestra si el navegador soporta push y hay sesión. En iPhone aparece
// pero solo funcionará si la app está instalada en pantalla de inicio.

import { useState, useEffect } from 'react';
import { isPushSupported, getPushStatus, subscribeToPush, type PushStatus } from '../lib/push';
import { useIsLive } from '../hooks/useSupabaseData';

export default function PushToggle() {
  const live = useIsLive();
  const [status, setStatus] = useState<PushStatus>('default');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setStatus(getPushStatus());
  }, []);

  if (!live || !isPushSupported()) return null;

  async function activate() {
    setBusy(true);
    setMsg(null);
    const r = await subscribeToPush();
    setMsg(r.message);
    setStatus(getPushStatus());
    setBusy(false);
  }

  const active = status === 'granted';
  const denied = status === 'denied';

  return (
    <section className="bg-[#1f1e1c] rounded-xl p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="material-symbols-outlined text-[#e5b85c]" style={{ fontVariationSettings: "'FILL' 1" }}>
          notifications_active
        </span>
        <div className="min-w-0">
          <p className="text-white text-sm font-bold">Notificaciones</p>
          <p className="text-[#c2b391] text-[11px] leading-tight">
            {active
              ? 'Activas en este dispositivo'
              : denied
              ? 'Bloqueadas — actívalas en los ajustes del navegador'
              : 'Avisos de partidos y monedas por vencer'}
          </p>
          {msg && <p className="text-[#f0d9a8] text-[10px] mt-0.5">{msg}</p>}
        </div>
      </div>
      {active ? (
        <span className="text-[#e5b85c] text-[11px] font-black uppercase tracking-wider whitespace-nowrap flex items-center gap-1">
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          Activas
        </span>
      ) : (
        <button
          onClick={activate}
          disabled={busy || denied}
          className="bg-[#d72a22] text-white px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider active:scale-95 disabled:opacity-40 whitespace-nowrap"
        >
          {busy ? '…' : 'Activar'}
        </button>
      )}
    </section>
  );
}