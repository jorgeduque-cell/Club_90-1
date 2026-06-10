// ============================================
// CLUB PYP — Programa de Estatus Mensual
// ============================================
// El estatus se gana CONSUMIENDO en Pachanga y Pochola durante el mes calendario.
// Se calcula client-side sumando amountCOP de las transacciones COINS_EARNED del mes
// (cada una nace de un código de cajero = venta real). RLS garantiza que cada usuario
// solo ve (y suma) sus propias transacciones. Se reinicia el día 1 de cada mes.

import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { useAuth } from '../context/AuthContext';
import { useIsLive } from '../hooks/useSupabaseData';

export interface StatusTier {
  name: string;
  /** Consumo mensual mínimo en COP para alcanzar el nivel */
  minCOP: number;
  color: string;
  icon: string;
}

// Umbrales de consumo mensual (COP). Ajustables con el dueño.
export const STATUS_TIERS: StatusTier[] = [
  { name: 'BRONCE',      minCOP: 0,       color: '#cd7f32', icon: 'military_tech' },
  { name: 'PLATA',       minCOP: 150_000, color: '#c0c0c0', icon: 'workspace_premium' },
  { name: 'DORADO',      minCOP: 400_000, color: '#e5b85c', icon: 'crown' },
  { name: 'LEYENDA PyP', minCOP: 800_000, color: '#d72a22', icon: 'local_fire_department' },
];

export interface MonthlyStatus {
  /** Consumo acumulado del mes en COP */
  monthlyCOP: number;
  tier: StatusTier;
  /** Siguiente nivel (null si ya es el máximo) */
  next: StatusTier | null;
  /** Progreso 0–100 hacia el siguiente nivel */
  progress: number;
  loading: boolean;
}

export function getStatus(monthlyCOP: number): Omit<MonthlyStatus, 'loading'> {
  let tier = STATUS_TIERS[0];
  for (const t of STATUS_TIERS) {
    if (monthlyCOP >= t.minCOP) tier = t;
  }
  const idx = STATUS_TIERS.indexOf(tier);
  const next = idx < STATUS_TIERS.length - 1 ? STATUS_TIERS[idx + 1] : null;
  const progress = next
    ? Math.min(100, Math.round(((monthlyCOP - tier.minCOP) / (next.minCOP - tier.minCOP)) * 100))
    : 100;
  return { monthlyCOP, tier, next, progress };
}

export function useMonthlyStatus(): MonthlyStatus {
  const { authUser } = useAuth();
  const live = useIsLive();
  const [monthlyCOP, setMonthlyCOP] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!live || !authUser) {
      setMonthlyCOP(0);
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('transactions')
        .select('amountCOP')
        .eq('type', 'COINS_EARNED')
        .gte('createdAt', monthStart.toISOString());

      if (mounted) {
        setMonthlyCOP((data ?? []).reduce((sum, t) => sum + (t.amountCOP || 0), 0));
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [live, authUser]);

  return { ...getStatus(monthlyCOP), loading };
}