// ============================================
// CLUB 90 — LoginPage (Login + Register)
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

export default function LoginPage() {
  const { signInWithPhone, signUpWithPhone, enterDemoMode, error: authError, clearError, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile) {
      navigate('/', { replace: true });
    }
  }, [profile, navigate]);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState('');

  const displayError = localError || authError;

  function switchMode(newMode: 'login' | 'register') {
    setMode(newMode);
    setLocalError('');
    setSuccess('');
    clearError();
  }

  async function handleLogin() {
    if (!phone || phone.length < 10) {
      setLocalError('Ingresa un número válido (10 dígitos)');
      return;
    }
    if (!pin || pin.length < 4) {
      setLocalError('Ingresa tu PIN (mínimo 4 dígitos)');
      return;
    }
    
    setLoading(true);
    setLocalError('');
    clearError();

    // Prevent hanging forever with a safety timeout
    let timedOut = false;
    const safetyTimer = setTimeout(() => {
      timedOut = true;
      setLoading(false);
      setLocalError('Error de red. El servidor tardó demasiado en responder.');
    }, 10000);

    try {
      await signInWithPhone(phone, pin);
    } catch (err: any) {
      console.error('Login error:', err);
    } finally {
      clearTimeout(safetyTimer);
      if (!timedOut) setLoading(false);
    }
  }

  async function handleRegister() {
    if (!phone || phone.length < 10) {
      setLocalError('Ingresa un número válido (10 dígitos)');
      return;
    }
    if (!name || name.length < 2) {
      setLocalError('Ingresa tu nombre');
      return;
    }
    if (!pin || pin.length < 4) {
      setLocalError('Crea un PIN de mínimo 4 dígitos');
      return;
    }
    setLoading(true);
    setLocalError('');
    clearError();

    let timedOut = false;
    const safetyTimer = setTimeout(() => {
      timedOut = true;
      setLoading(false);
      setLocalError('Error de red. El servidor tardó demasiado en responder.');
    }, 10000);

    try {
      await signUpWithPhone(phone, name, pin);
      setSuccess('¡Cuenta creada! Ingresando...');
    } catch (err: any) {
      console.error('Register error:', err);
    } finally {
      clearTimeout(safetyTimer);
      if (!timedOut) setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#031522] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#1475e1]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-[#00e601]/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Logo */}
      <div className="relative z-10 text-center mb-10">
        <h1 className="text-5xl font-black text-white uppercase tracking-tighter italic">
          CLUB 90+1
        </h1>
        <p className="text-[#c1c6d5] text-xs font-bold uppercase tracking-[0.3em] mt-2">
          Pronósticos entre amigos
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="relative z-10 w-full max-w-sm mb-6">
        <div className="flex bg-[#1a2c39] rounded-lg p-1">
          <button
            onClick={() => switchMode('login')}
            className={`flex-1 py-2.5 rounded-md text-xs font-black uppercase tracking-widest transition-all ${
              mode === 'login'
                ? 'bg-[#00e601] text-[#013a00] shadow-md'
                : 'text-[#c1c6d5] hover:text-white'
            }`}
          >
            Ingresar
          </button>
          <button
            onClick={() => switchMode('register')}
            className={`flex-1 py-2.5 rounded-md text-xs font-black uppercase tracking-widest transition-all ${
              mode === 'register'
                ? 'bg-[#1475e1] text-white shadow-md'
                : 'text-[#c1c6d5] hover:text-white'
            }`}
          >
            Registrarse
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="relative z-10 w-full max-w-sm space-y-4">
        {/* Phone */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-[#c1c6d5] uppercase tracking-widest">
            Número de Teléfono
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#c1c6d5] text-sm font-bold">+57</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="300 123 4567"
              className="w-full bg-[#1a2c39] border border-[#414753]/30 rounded-lg py-3.5 pl-12 pr-4 text-white font-bold text-lg focus:ring-1 focus:ring-[#1475e1]/40 focus:border-[#1475e1]/40 outline-none placeholder:text-[#c1c6d5]/30"
            />
          </div>
        </div>

        {/* Name (register only) */}
        {mode === 'register' && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#c1c6d5] uppercase tracking-widest">
              Tu Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Juan, La Máquina, El Preciso..."
              maxLength={30}
              className="w-full bg-[#1a2c39] border border-[#414753]/30 rounded-lg py-3.5 px-4 text-white font-bold focus:ring-1 focus:ring-[#1475e1]/40 focus:border-[#1475e1]/40 outline-none placeholder:text-[#c1c6d5]/30"
            />
          </div>
        )}

        {/* PIN */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-[#c1c6d5] uppercase tracking-widest">
            {mode === 'register' ? 'Crea tu PIN' : 'PIN de Acceso'}
          </label>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            maxLength={20}
            onKeyDown={(e) => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleRegister())}
            className="w-full bg-[#1a2c39] border border-[#414753]/30 rounded-lg py-3.5 px-4 text-white font-black text-2xl text-center tracking-[0.5em] focus:ring-1 focus:ring-[#1475e1]/40 focus:border-[#1475e1]/40 outline-none placeholder:text-[#c1c6d5]/30"
          />
          <p className="text-[#c1c6d5] text-[10px] text-center">
            {mode === 'register' ? 'Mínimo 4 caracteres. No lo olvides.' : 'El PIN que creaste al registrarte'}
          </p>
        </div>

        {/* Submit Button */}
        <button
          onClick={mode === 'login' ? handleLogin : handleRegister}
          disabled={loading}
          className={`w-full font-black text-sm py-4 rounded-lg uppercase tracking-widest active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg ${
            mode === 'login'
              ? 'bg-[#00e601] text-[#0f212e] shadow-[0_4px_16px_rgba(0,230,1,0.3)]'
              : 'bg-[#1475e1] text-white shadow-[0_4px_16px_rgba(20,117,225,0.3)]'
          }`}
        >
          {loading ? '⏳ Procesando...' : mode === 'login' ? 'Ingresar' : 'Crear Cuenta'}
        </button>

        {/* Success */}
        {success && (
          <div className="bg-[#00e601]/10 border border-[#00e601]/20 rounded-lg px-4 py-3 text-center">
            <span className="text-[#77ff61] text-xs font-bold">{success}</span>
          </div>
        )}

        {/* Error */}
        {displayError && (
          <div className="bg-[#93000a]/20 border border-[#ffb4ab]/20 rounded-lg px-4 py-3 text-center">
            <span className="text-[#ffb4ab] text-xs font-bold">{displayError}</span>
          </div>
        )}

        {/* Demo Mode — Solo visible en desarrollo */}
        {import.meta.env.DEV && (
          <>
            <div className="flex items-center gap-4 py-2">
              <div className="flex-1 h-px bg-[#414753]/30" />
              <span className="text-[#c1c6d5] text-[10px] font-bold uppercase tracking-widest">o</span>
              <div className="flex-1 h-px bg-[#414753]/30" />
            </div>
            <button
              onClick={() => enterDemoMode()}
              className="w-full bg-[#253744] text-[#c1c6d5] font-bold text-xs py-4 rounded-lg uppercase tracking-widest hover:bg-[#2a3b49] hover:text-white transition-all active:scale-[0.98] border border-[#414753]/20"
            >
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm">play_arrow</span>
                Entrar en Modo Demo
              </span>
            </button>
          </>
        )}
      </div>

      {/* Footer */}
      <p className="absolute bottom-8 text-[#c1c6d5]/40 text-[9px] font-medium text-center">
        Al continuar, aceptas nuestros Términos de Servicio
      </p>
    </div>
  );
}
