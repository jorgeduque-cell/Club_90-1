// ============================================
// CLUB PYP — Edge Function: send-push  (AUTOCONTENIDA, pegar en el dashboard)
// ============================================
// Envía una notificación web push a TODOS los dispositivos de un usuario.
// Para llamarse desde dentro (cron de expiración, aviso de partido, etc.), NO desde
// el cliente: se protege con el header x-push-secret == PUSH_INTERNAL_SECRET.
//
// POST /functions/v1/send-push
// Headers: x-push-secret: <PUSH_INTERNAL_SECRET>
// Body: { "userId": "...", "title": "...", "body": "...", "url": "/" }
//
// Secrets requeridos (Supabase → Edge Functions → Manage secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...), PUSH_INTERNAL_SECRET
// (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya los inyecta Supabase automáticamente.)

import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-push-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@pachangaypocholapyp.com';
const INTERNAL_SECRET = Deno.env.get('PUSH_INTERNAL_SECRET') ?? '';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

function json(status: number, obj: unknown): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return json(500, { error: 'Faltan los secrets VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY' });
  }
  if (!INTERNAL_SECRET || req.headers.get('x-push-secret') !== INTERNAL_SECRET) {
    return json(401, { error: 'No autorizado' });
  }

  let payload: { userId?: string; title?: string; body?: string; url?: string };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: 'Body inválido' });
  }

  const { userId, title, body, url } = payload;
  if (!userId || !title) return json(400, { error: 'userId y title son requeridos' });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('userId', userId);

  if (error) return json(500, { error: error.message });
  if (!subs || subs.length === 0) return json(200, { sent: 0, note: 'usuario sin suscripciones' });

  const message = JSON.stringify({ title, body: body ?? '', url: url ?? '/' });
  let sent = 0;

  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        message,
      );
      sent++;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) {
        await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
      }
    }
  }

  return json(200, { sent, total: subs.length });
});