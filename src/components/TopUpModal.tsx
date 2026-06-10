// ============================================
// CLUB PYP — TopUp Modal (CONTEXTO §6 Compliant)
// ============================================
// Fixed Package: $20,000 COP → 5,000 PyP Coins
// Bankruptcy Rule: balance < 2,000
// Weekly Cap: Max 2 recharges/week

import { useState } from 'react';
import { useAppStore, RECHARGE_COINS, RECHARGE_COP, RECHARGE_MIN_BALANCE, RECHARGE_WEEKLY_CAP } from '../stores/appStore';
import { useIsLive } from '../hooks/useSupabaseData';
import { useAuth } from '../context/AuthContext';

const PAYMENT_METHODS = [
  { id: 'nequi', name: 'Nequi', icon: 'phone_android', color: '#e0258f' },
  { id: 'daviplata', name: 'Daviplata', icon: 'account_balance', color: '#e30613' },
  { id: 'whatsapp', name: 'WhatsApp Bot', icon: 'chat', color: '#25d366' },
];

export default function TopUpModal() {
  const isOpen = useAppStore((s) => s.topUpModalOpen);
  const closeModal = useAppStore((s) => s.closeTopUpModal);
  const topUp = useAppStore((s) => s.topUp);
  const canRecharge = useAppStore((s) => s.canRecharge);
  const demoBalance = useAppStore((s) => s.balance);
  const weeklyRecharges = useAppStore((s) => s.weeklyRecharges);
  const live = useIsLive();
  const { profile } = useAuth();
  const balance = live && profile ? profile.clCoins : demoBalance;

  const [selectedMethod, setSelectedMethod] = useState('nequi');
  const [step, setStep] = useState<'info' | 'method' | 'confirm'>('info');

  if (!isOpen) return null;

  const { allowed, reason } = canRecharge(balance);
  const method = PAYMENT_METHODS.find((m) => m.id === selectedMethod)!;

  function handleConfirm() {
    const result = topUp(method.name);
    if (result) {
      setStep('info');
    }
  }

  function handleClose() {
    closeModal();
    setStep('info');
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
              <div className="flex items-center gap-3">
                {step !== 'info' && (
                  <button
                    onClick={() => setStep(step === 'confirm' ? 'method' : 'info')}
                    className="text-[#f0d9a8] hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                )}
                <div>
                  <h3 className="text-white font-black text-lg uppercase tracking-tight">
                    {step === 'info' ? 'Vida Extra' : step === 'method' ? 'Método de Pago' : 'Confirmar Recarga'}
                  </h3>
                  <p className="text-[#c2b391] text-[10px] font-bold uppercase tracking-widest">
                    Balance: {balance.toLocaleString()} 🪙
                  </p>
                </div>
              </div>
              <button onClick={handleClose} className="text-[#b8a98a] hover:text-white transition-colors p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* STEP 1: Package Info */}
            {step === 'info' && (
              <div className="space-y-4">
                {/* Fixed Package Card */}
                <div className="bg-gradient-to-br from-[#1f1e1c] to-[#2e2c29] rounded-xl p-5 border border-[#d72a22]/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-[#e5b85c]/5 rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <span className="bg-[#d72a22]/20 text-[#f0d9a8] text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                        Paquete Único
                      </span>
                      <span className="text-[#c2b391] text-[10px] font-bold">
                        {weeklyRecharges}/{ RECHARGE_WEEKLY_CAP} esta semana
                      </span>
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-[#e5b85c] text-5xl font-black tabular-nums tracking-tighter">
                        {RECHARGE_COINS.toLocaleString()} 🪙
                      </p>
                      <p className="text-[#c2b391] text-xs font-bold">PyP Coins</p>
                      <div className="h-px bg-[#4c4843]/20 my-3" />
                      <p className="text-white text-xl font-black tabular-nums">
                      {RECHARGE_COP.toLocaleString()} COP
                      </p>
                      <p className="text-[#c2b391] text-[10px]">Transferencia vía Nequi / Daviplata</p>
                    </div>
                  </div>
                </div>

                {/* Rules */}
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-[#c2b391] uppercase tracking-[0.2em] px-1">Reglas de Recarga</p>
                  {[
                    {
                      icon: 'inventory_2',
                      text: `Paquete fijo: $${RECHARGE_COP.toLocaleString()} COP = ${RECHARGE_COINS.toLocaleString()} 🪙`,
                      color: '#e5b85c',
                    },
                    {
                      icon: 'battery_low',
                      text: `Solo disponible si tu saldo < ${RECHARGE_MIN_BALANCE.toLocaleString()} 🪙`,
                      color: '#ffc107',
                    },
                    {
                      icon: 'event_repeat',
                      text: `Máximo ${RECHARGE_WEEKLY_CAP} recargas por semana (Lunes a Domingo)`,
                      color: '#f0d9a8',
                    },
                  ].map((rule) => (
                    <div key={rule.icon} className="bg-[#1f1e1c] rounded-lg p-3 flex items-center gap-3">
                      <span className="material-symbols-outlined text-sm" style={{ color: rule.color }}>{rule.icon}</span>
                      <span className="text-[#efe6d2] text-[11px] font-medium">{rule.text}</span>
                    </div>
                  ))}
                </div>

                {/* CTA or Blocked */}
                {allowed ? (
                  <button
                    onClick={() => setStep('method')}
                    className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest bg-[#d72a22] text-white active:scale-[0.98] shadow-[0_4px_16px_rgba(215,42,34,0.3)] transition-all"
                  >
                    Comprar Vida Extra
                  </button>
                ) : (
                  <div className="bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 rounded-xl p-4 text-center space-y-2">
                    <span className="material-symbols-outlined text-[#ffb4ab] text-2xl">lock</span>
                    <p className="text-[#ffb4ab] text-xs font-bold leading-relaxed">{reason}</p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: Payment Method */}
            {step === 'method' && (
              <div className="space-y-3">
                <p className="text-[#c2b391] text-xs">
                  Selecciona cómo harás la transferencia de <span className="text-white font-bold">${RECHARGE_COP.toLocaleString()} COP</span>
                </p>
                {PAYMENT_METHODS.map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => { setSelectedMethod(pm.id); setStep('confirm'); }}
                    className="w-full bg-[#1f1e1c] rounded-xl p-4 flex items-center gap-4 transition-all active:scale-[0.98] hover:bg-[#2e2c29]"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${pm.color}20` }}
                    >
                      <span className="material-symbols-outlined text-xl" style={{ color: pm.color }}>
                        {pm.icon}
                      </span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-bold text-sm">{pm.name}</p>
                      <p className="text-[#c2b391] text-[10px]">Recarga instantánea</p>
                    </div>
                    <span className="material-symbols-outlined text-[#4c4843]">chevron_right</span>
                  </button>
                ))}
              </div>
            )}

            {/* STEP 3: Confirm */}
            {step === 'confirm' && (
              <div className="space-y-5">
                {/* Summary Card */}
                <div className="bg-[#1f1e1c] rounded-xl p-5 space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-[#4c4843]/20">
                    <span className="text-[#c2b391] text-xs font-bold uppercase tracking-widest">Recibes</span>
                    <span className="text-[#e5b85c] text-2xl font-black tabular-nums">{RECHARGE_COINS.toLocaleString()} 🪙</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-[#4c4843]/20">
                    <span className="text-[#c2b391] text-xs font-bold uppercase tracking-widest">Pagas</span>
                    <span className="text-white font-black text-lg tabular-nums">${RECHARGE_COP.toLocaleString()} COP</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-[#4c4843]/20">
                    <span className="text-[#c2b391] text-xs font-bold uppercase tracking-widest">Método</span>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm" style={{ color: method.color }}>{method.icon}</span>
                      <span className="text-white font-bold text-sm">{method.name}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-[#4c4843]/20">
                    <span className="text-[#c2b391] text-xs font-bold uppercase tracking-widest">XP Bonus</span>
                    <span className="text-[#f0d9a8] font-bold text-sm">+{Math.floor(RECHARGE_COINS * 0.1).toLocaleString()} XP</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#c2b391] text-xs font-bold uppercase tracking-widest">Nuevo Balance</span>
                    <span className="text-white font-black text-lg tabular-nums">{(balance + RECHARGE_COINS).toLocaleString()} 🪙</span>
                  </div>
                </div>

                <p className="text-[#c2b391] text-[9px] leading-relaxed opacity-60 text-center">
                  {live
                    ? 'Contacta al administrador para verificar tu pago y acreditar los PyP Coins.'
                    : 'En modo demo, la recarga es instantánea.'}
                </p>

                <button
                  onClick={handleConfirm}
                  className="w-full bg-[#d72a22] text-white py-4 rounded-xl font-black text-base uppercase tracking-widest active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(215,42,34,0.3)]"
                >
                  Confirmar Recarga
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
