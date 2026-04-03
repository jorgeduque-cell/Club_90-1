// ============================================
// CLUB 90 — Auth Context (State Logic)
// ============================================
// Manages authentication state, session persistence,
// and user profile data. Exposes auth actions and
// current user to the entire component tree.
//
// This is LOGIC, not UI. KIMI CODE wraps this
// with visual components (LoginForm, ProtectedRoute, etc.)

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase, UserProfile, isSupabaseConfigured } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

// ─── Types ──────────────────────────────────

export interface AuthState {
  /** Supabase session (null if not authenticated) */
  session: Session | null;
  /** Supabase Auth user (null if not authenticated) */
  authUser: User | null;
  /** Club 90 user profile from public.users (null if not loaded) */
  profile: UserProfile | null;
  /** True while checking initial session */
  loading: boolean;
  /** Auth error message (Spanish) */
  error: string | null;
}

export interface AuthActions {
  /** Sign in with phone number + PIN (password) */
  signInWithPhone: (phone: string, pin: string) => Promise<void>;
  /** Self-register with phone + name + PIN */
  signUpWithPhone: (phone: string, name: string, pin: string) => Promise<void>;
  /** Sign out and clear session */
  signOut: () => Promise<void>;
  /** Refresh user profile from database */
  refreshProfile: () => Promise<void>;
  /** Clear any auth error */
  clearError: () => void;
  /** Enter demo mode (skip auth for development) */
  enterDemoMode: () => void;
}

export type AuthContextType = AuthState & AuthActions;

// ─── Context ────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ───────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Load profile via RPC (bypasses RLS with SECURITY DEFINER) ──
  const loadProfile = useCallback(async (_userId: string) => {
    try {
      const { data, error: fetchError } = await supabase.rpc('get_my_profile');

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Profile not found');
      setProfile(data as UserProfile);
    } catch (err) {
      console.error('Error loading profile:', err);
      setProfile(null);
    }
  }, []);

  // ── Initialize: check existing session ──
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();

        if (existingSession && mounted) {
          setSession(existingSession);
          setAuthUser(existingSession.user);
          await loadProfile(existingSession.user.id);
        }
      } catch {
        console.error('Error initializing auth');
        // Clear corrupted session
        await supabase.auth.signOut();
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // Safety timeout: never stay loading more than 5 seconds
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 5000);

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setAuthUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Avoid Supabase JS Mutex Deadlock: 
          // gotrue-js awaits this callback while holding the lock.
          // IF we await a DB query here, the DB query waits for the lock. Deadlock!
          // So we use setTimeout to run it AFTER the lock is released.
          setTimeout(() => {
            loadProfile(newSession.user.id);
          }, 0);
        } else {
          setProfile(null);
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  // ── Subscribe to balance changes (Realtime) ──
  useEffect(() => {
    if (!authUser) return;

    const channel = supabase
      .channel(`balance-${authUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${authUser.id}`,
        },
        (payload) => {
          setProfile((prev) =>
            prev ? { ...prev, clCoins: (payload.new as UserProfile).clCoins } : null
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser]);

  // ── Actions ───────────────────────────────

  const signInWithPhone = useCallback(async (phone: string, pin: string) => {
    setError(null);
    try {
      const fakeEmail = `${phone.replace(/\D/g, '')}@club90.app`;
      // [PROD] Log removed — was leaking email to browser console
      
      const paddedPin = `c90_${pin}`;
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password: paddedPin,
      });

      // [PROD] Log removed — was leaking auth error details

      if (signInError) {
        if (signInError.message.includes('Invalid login')) {
          throw new Error('Teléfono o PIN incorrecto');
        }
        throw signInError;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(message);
      throw err;
    }
  }, []);

  const signUpWithPhone = useCallback(async (phone: string, name: string, pin: string) => {
    setError(null);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const fakeEmail = `${cleanPhone}@club90.app`;

      const paddedPin = `c90_${pin}`;

      // 1. Create auth user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: fakeEmail,
        password: paddedPin,
        options: {
          data: { phone: cleanPhone, name },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          throw new Error('Este número ya está registrado. Usa Ingresar.');
        }
        throw signUpError;
      }

      if (!signUpData.user) throw new Error('Error al crear cuenta');

      // 2. Create profile via RPC (SECURITY DEFINER, bypasses RLS)
      const { data: profileData, error: rpcError } = await supabase.rpc('create_my_profile', {
        p_phone: cleanPhone,
        p_name: name
      });

      if (rpcError) {
        console.warn('⚠️ [Auth] Profile RPC error (trigger may handle):', rpcError.message);
      }

      // Auto-login after registration
      if (profileData) {
        setProfile(profileData as UserProfile);
      } else {
        await loadProfile(signUpData.user.id);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al registrarse';
      setError(message);
      throw err;
    }
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    setError(null);
    await supabase.auth.signOut();
    setSession(null);
    setAuthUser(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (authUser) {
      await loadProfile(authUser.id);
    }
  }, [authUser, loadProfile]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const enterDemoMode = useCallback(() => {
    // S7: Block demo mode in production — prevent console abuse
    if (typeof window !== 'undefined' && !(window as any).__VITE_DEV__) {
      const isDev = import.meta.env?.DEV;
      if (!isDev) return;
    }
    setProfile({
      id: 'demo-user-001',
      phone: '573001234567',
      name: 'Jugador Demo',
      clCoins: 10000,
      role: 'PLAYER',
      accountTier: 'PREMIUM',
      isBankrupt: false,
      storedLifeSavers: 2,
      currentStreak: 1,
      createdAt: new Date().toISOString(),
    });
    setLoading(false);
  }, []);

  // ── Context Value ─────────────────────────

  const value: AuthContextType = {
    session,
    authUser,
    profile,
    loading,
    error,
    signInWithPhone,
    signUpWithPhone,
    signOut,
    refreshProfile,
    clearError,
    enterDemoMode,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────

/**
 * Access auth state and actions from any component.
 *
 * @example
 * ```tsx
 * const { profile, signOut } = useAuth();
 * ```
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return context;
}
