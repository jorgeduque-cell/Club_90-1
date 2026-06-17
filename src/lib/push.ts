// ============================================
// CLUB PYP — Web Push (cliente)
// ============================================
// Registra el service worker, pide permiso, crea la suscripción y la guarda en
// Supabase. Push web funciona bien en Android (Chrome). En iPhone solo si la app
// está instalada en pantalla de inicio (iOS 16.4+). Por eso WhatsApp sigue siendo
// el canal principal de avisos masivos.

import { supabase } from './supabase';

// Clave VAPID PÚBLICA (no es secreta — se entrega al navegador). La privada vive
// como secret de Supabase para la Edge Function `send-push`.
const VAPID_PUBLIC_KEY = 'BO73BVKEmMIgCpVSOpuVLekLjc2Yr9zjXpnDVsJIUBA-PiisXyV7EgAXXQSMrztMOiFusbU3DN96OeGb_505Mgs';

export type PushStatus = 'unsupported' | 'default' | 'granted' | 'denied';

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getPushStatus(): PushStatus {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission as PushStatus;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch (e) {
    console.error('SW register failed', e);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function subscribeToPush(): Promise<{ ok: boolean; message: string }> {
  if (!isPushSupported()) {
    return { ok: false, message: 'Este dispositivo no soporta notificaciones push.' };
  }

  const reg = await registerServiceWorker();
  if (!reg) return { ok: false, message: 'No se pudo iniciar el service worker.' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, message: 'No diste permiso de notificaciones.' };
  }

  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = sub.toJSON();
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys?.p256dh,
    p_auth: json.keys?.auth,
  });
  if (error) {
    return { ok: false, message: 'No se pudo guardar la suscripción.' };
  }

  return { ok: true, message: '¡Notificaciones activadas en este dispositivo!' };
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await supabase.rpc('delete_push_subscription', { p_endpoint: sub.endpoint });
    await sub.unsubscribe();
  }
}