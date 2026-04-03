// ============================================
// CLUB 90+1 — Telegram Admin Bot v3 (Production)
// ============================================
// Updated for 90+1 schema: real_teams, real_players,
// match_markets with camelCase columns.
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Supabase ───────────────────────────────

function db() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── Telegram ───────────────────────────────

const TK = () => Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const ADMIN = () => parseInt(Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') || '0');
const API = () => `https://api.telegram.org/bot${TK()}`;
const isAdmin = (id: number) => id === ADMIN();

async function send(cid: number, text: string) {
  await fetch(`${API()}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: cid, text, parse_mode: 'HTML' }) });
}

async function sendKB(cid: number, text: string, btns: { text: string; callback_data: string }[][]) {
  await fetch(`${API()}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: cid, text, parse_mode: 'HTML', reply_markup: { inline_keyboard: btns } }) });
}

async function answerCB(id: string) {
  await fetch(`${API()}/answerCallbackQuery`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: id }) });
}

async function downloadFile(fileId: string) {
  const r = await fetch(`${API()}/getFile`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId }) });
  const d = await r.json();
  const fp = d.result.file_path;
  const dl = await fetch(`https://api.telegram.org/file/bot${TK()}/${fp}`);
  return { buffer: await dl.arrayBuffer(), ext: fp.split('.').pop() || 'jpg' };
}

// ─── Persistent State ───────────────────────

async function getState(s: any, cid: number) {
  const { data } = await s.from('bot_state').select('action, data').eq('chat_id', cid).single();
  return data as { action: string; data: Record<string, any> } | null;
}

async function setState(s: any, cid: number, action: string, stData: Record<string, any>) {
  const { error } = await s.from('bot_state').upsert({ chat_id: cid, action, data: stData, updated_at: new Date().toISOString() });
  if (error) console.error('setState ERROR:', error);
}

async function clearState(s: any, cid: number) {
  await s.from('bot_state').delete().eq('chat_id', cid);
}

// ─── Main ───────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok');
  try {
    const update = await req.json();
    const s = db();

    // ── Callbacks ──
    if (update.callback_query) {
      const cb = update.callback_query;
      const cid = cb.message?.chat?.id;
      if (!cid || !isAdmin(cid)) return new Response('ok');
      await answerCB(cb.id);
      const d = cb.data as string;

      if (d === 'noop') { /* do nothing */ }
      else if (d.startsWith('nomina:')) await showRoster(s, cid, d.split(':')[1]);
      else if (d.startsWith('del_team:')) await delTeam(s, cid, d.split(':')[1]);
      else if (d.startsWith('del_player:')) await delPlayer(s, cid, d.split(':')[1]);
      else if (d.startsWith('logo:')) { await setState(s, cid, 'logo', { teamId: d.split(':')[1] }); await send(cid, '📸 Envíame la <b>foto del escudo</b>:'); }
      else if (d.startsWith('add_player:')) { await setState(s, cid, 'player', { teamId: d.split(':')[1], step: 'name' }); await send(cid, '👤 Escribe el <b>nombre completo</b> del jugador:'); }
      else if (d.startsWith('result:')) {
        const parts = d.split(':');
        const matchId = parts[1];
        const result = parts[2];
        await setState(s, cid, 'score', { matchId, result });
        const labels: Record<string,string> = { HOME_WIN: '🏠 Local', DRAW: '🤝 Empate', AWAY_WIN: '✈️ Visitante' };
        await send(cid, `${labels[result] || result}\n\n⚽ Escribe el <b>marcador</b> (ej: <code>2-1</code>):`);
      }

      return new Response('ok');
    }

    // ── Messages ──
    const msg = update.message;
    if (!msg) return new Response('ok');
    const cid = msg.chat?.id;
    const txt = (msg.text || '').trim();
    if (!isAdmin(cid)) { return new Response('ok'); } // Silent ignore — no info leak

    // ── Photo ──
    if (msg.photo) {
      const st = await getState(s, cid);
      if (st) {
        const fid = msg.photo[msg.photo.length - 1].file_id;
        if (st.action === 'logo') await uploadLogo(s, cid, st.data.teamId, fid);
        else if (st.action === 'player_photo') await uploadPlayerPhoto(s, cid, st.data.playerId, fid);
        await clearState(s, cid);
      } else {
        await send(cid, '❓ No esperaba una foto. Usa /logo para subir escudos.');
      }
      return new Response('ok');
    }

    // ── Conversational flows ──
    if (txt && !txt.startsWith('/')) {
      const st = await getState(s, cid);
      if (st) {
        if (st.action === 'new_team') await flowTeam(s, cid, txt, st);
        else if (st.action === 'player') await flowPlayer(s, cid, txt, st);
        else if (st.action === 'match') await flowMatch(s, cid, txt, st);
        else if (st.action === 'score') await flowScore(s, cid, txt, st);
        else await send(cid, '❓ Usa /start para ver comandos.');
        return new Response('ok');
      }
    }

    // ── Commands ──
    if (txt === '/start') await cmdStart(cid);
    else if (txt === '/equipos') await cmdTeams(s, cid);
    else if (txt === '/nuevo_equipo') { await setState(s, cid, 'new_team', { step: 'name' }); await send(cid, '⚽ <b>Crear Equipo</b>\n\nEscribe el <b>nombre</b> del equipo:'); }
    else if (txt === '/jugador') await cmdPickTeam(s, cid, 'add_player', '👤 <b>Agregar Jugador</b>\nSelecciona equipo:');
    else if (txt === '/nomina') await cmdPickTeam(s, cid, 'nomina', '📋 <b>Ver Nómina</b>\nSelecciona equipo:');
    else if (txt === '/logo') await cmdPickTeam(s, cid, 'logo', '🖼 <b>Subir Escudo</b>\nSelecciona equipo:');
    else if (txt === '/partido') { await setState(s, cid, 'match', { step: 'input' }); await cmdMatchHelp(s, cid); }
    else if (txt === '/partidos') await cmdMatches(s, cid);
    else if (txt === '/resultado') await cmdResultStart(s, cid);
    else if (txt === '/eliminar_equipo') await cmdDeleteStart(s, cid);
    else if (txt.startsWith('/activar')) await cmdActivar(s, cid, txt);
    else if (txt.startsWith('/recargar')) await cmdRecargar(s, cid, txt);
    else if (txt.startsWith('/crear')) await cmdCrear(s, cid, txt);
    else if (txt === '/usuarios') await cmdUsuarios(s, cid);
    else if (txt === '/cancelar') { await clearState(s, cid); await send(cid, '❌ Cancelado.'); }
    else await send(cid, '❓ Comando no reconocido. Usa /start');

    return new Response('ok');
  } catch (e) { console.error('Bot error:', e); return new Response('ok'); }
});

// ═══════════════════════════════════════════
//  COMMANDS
// ═══════════════════════════════════════════

async function cmdStart(cid: number) {
  await send(cid, `🏆 <b>Club 90+1 — Admin Bot</b>\n\n<b>⚽ Equipos</b>\n/nuevo_equipo — Crear equipo\n/equipos — Ver equipos\n/jugador — Agregar jugador\n/nomina — Ver nómina\n/logo — Subir escudo\n/eliminar_equipo — Eliminar\n\n<b>🏟 Partidos</b>\n/partido — Crear partido\n/partidos — Ver abiertos\n/resultado — Registrar resultado\n\n<b>💰 Usuarios</b>\n/crear 312... Nombre PIN — Crear usuario\n/usuarios — Ver jugadores\n/activar 312... — Pase Premium (10K 🪙)\n/recargar 312... — Vida Extra (5K 🪙)\n\n/cancelar — Cancelar operación`);
}

async function cmdTeams(s: any, cid: number) {
  const { data: teams } = await s.from('real_teams').select('id, name').order('name');
  if (!teams?.length) return send(cid, '📭 No hay equipos. Usa /nuevo_equipo');
  let m = `⚽ <b>Equipos (${teams.length})</b>\n\n`;
  teams.forEach((t: any, i: number) => { m += `${i + 1}. <b>${t.name}</b>\n`; });
  const btns = teams.slice(0, 30).map((t: any) => ([
    { text: `📋 ${t.name}`, callback_data: `nomina:${t.id}` },
    { text: `🖼`, callback_data: `logo:${t.id}` },
  ]));
  await sendKB(cid, m, btns);
}

async function cmdPickTeam(s: any, cid: number, cbPrefix: string, title: string) {
  const { data: teams } = await s.from('real_teams').select('id, name').order('name');
  if (!teams?.length) return send(cid, '📭 Crea un equipo primero: /nuevo_equipo');
  await sendKB(cid, title, teams.map((t: any) => ([{ text: `⚽ ${t.name}`, callback_data: `${cbPrefix}:${t.id}` }])));
}

// ── Create Team ─────────────────────────────

async function flowTeam(s: any, cid: number, txt: string, st: any) {
  const step = st.data.step;
  if (step === 'name') {
    await setState(s, cid, 'new_team', { step: 'done', name: txt });
    const { data: team, error } = await s.from('real_teams').insert({ id: crypto.randomUUID(), name: txt }).select().single();
    await clearState(s, cid);
    if (error) return send(cid, error.message.includes('duplicate') ? `❌ Ya existe "<b>${txt}</b>".` : `❌ ${error.message}`);
    await sendKB(cid, `✅ <b>${team.name}</b> creado!`, [
      [{ text: '👤 Agregar Jugadores', callback_data: `add_player:${team.id}` }],
      [{ text: '🖼 Subir Escudo', callback_data: `logo:${team.id}` }],
    ]);
  }
}

// ── Player ──────────────────────────────────

async function flowPlayer(s: any, cid: number, txt: string, st: any) {
  if (st.data.step === 'name') {
    const { data: player, error } = await s.from('real_players').insert({ id: crypto.randomUUID(), realTeamId: st.data.teamId, name: txt }).select().single();
    if (error) { await clearState(s, cid); return send(cid, `❌ ${error.message}`); }
    await setState(s, cid, 'player_photo', { playerId: player.id, teamId: st.data.teamId });
    await send(cid, `✅ <b>${player.name}</b> agregado.\n\n📸 Envía <b>foto</b> o /cancelar`);
  }
}

// ── Roster ──────────────────────────────────

async function showRoster(s: any, cid: number, teamId: string) {
  const { data: team } = await s.from('real_teams').select('name, logoUrl').eq('id', teamId).single();
  const { data: players } = await s.from('real_players').select('id, name').eq('realTeamId', teamId).order('name', { ascending: true });
  if (!team) return send(cid, '❌ Equipo no encontrado.');
  let m = `📋 <b>${team.name}</b>${team.logoUrl ? '\n🖼 ✅' : ''}\n\n`;
  if (!players?.length) m += '<i>Sin jugadores</i>';
  else { m += `<b>Nómina (${players.length}):</b>\n\n`; players.forEach((p: any, i: number) => { m += `${i + 1}. <b>${p.name}</b>\n`; }); }
  await sendKB(cid, m, [
    [{ text: '👤 Agregar', callback_data: `add_player:${teamId}` }],
    [{ text: '🖼 Logo', callback_data: `logo:${teamId}` }],
  ]);
}

// ── Match ────────────────────────────────────

async function cmdMatchHelp(s: any, cid: number) {
  const { data: teams } = await s.from('real_teams').select('name').order('name');
  let m = '⚽ <b>Crear Partido</b>\n\nEscribe así:\n<code>Local vs Visitante\n2026-04-05 15:00</code>\n\n<b>Equipos:</b>\n';
  teams?.forEach((t: any) => { m += `• ${t.name}\n`; });
  await send(cid, m);
}

async function flowMatch(s: any, cid: number, txt: string, _st: any) {
  const lines = txt.split('\n').map((l: string) => l.trim()).filter(Boolean);
  let teamsLine = '', dateLine = '';
  if (lines.length >= 2) { teamsLine = lines[0]; dateLine = lines[1]; }
  else { const dm = txt.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/); if (dm) { dateLine = dm[1]; teamsLine = txt.replace(dateLine, '').trim(); } else { return send(cid, '❌ Formato:\n<code>Local vs Visitante\n2026-04-05 15:00</code>'); } }

  const vs = teamsLine.split(/\s+vs\.?\s+/i);
  if (vs.length !== 2) return send(cid, '❌ Usa "Local <b>vs</b> Visitante"');

  const { data: home } = await s.from('real_teams').select('id, name').ilike('name', `%${vs[0].trim()}%`).limit(1).single();
  const { data: away } = await s.from('real_teams').select('id, name').ilike('name', `%${vs[1].trim()}%`).limit(1).single();
  if (!home) { await clearState(s, cid); return send(cid, `❌ No encontré "<b>${vs[0]}</b>"`); }
  if (!away) { await clearState(s, cid); return send(cid, `❌ No encontré "<b>${vs[1]}</b>"`); }

  const st_date = new Date(dateLine.replace(' ', 'T') + ':00-05:00');
  if (isNaN(st_date.getTime())) { await clearState(s, cid); return send(cid, '❌ Fecha inválida: <code>2026-04-05 15:00</code>'); }

  const { data: match, error } = await s.from('match_markets').insert({
    id: crypto.randomUUID(),
    realTeamHomeId: home.id,
    realTeamAwayId: away.id,
    multiplierHome: 1.5,
    multiplierDraw: 3.5,
    multiplierAway: 2.8,
    startTime: st_date.toISOString(),
    status: 'OPEN',
    result: 'PENDING'
  }).select().single();

  if (error) { await clearState(s, cid); return send(cid, `❌ ${error.message}`); }
  await clearState(s, cid);

  const ds = st_date.toLocaleString('es-CO', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  await send(cid, `✅ <b>Partido creado!</b>\n\n⚽ ${home.name} vs ${away.name}\n📅 ${ds}\n🆔 <code>${match.id.slice(0, 8)}</code>\n\n🟢 OPEN`);
}

async function cmdMatches(s: any, cid: number) {
  const { data: matches } = await s.from('match_markets')
    .select('id, realTeamHomeId, realTeamAwayId, startTime, status')
    .in('status', ['OPEN', 'CLOSED'])
    .order('startTime');

  if (!matches?.length) return send(cid, '📭 No hay partidos. Usa /partido');

  // Fetch team names
  const teamIds = [...new Set(matches.flatMap((m: any) => [m.realTeamHomeId, m.realTeamAwayId]))];
  const { data: teams } = await s.from('real_teams').select('id, name').in('id', teamIds);
  const teamMap: Record<string, string> = {};
  teams?.forEach((t: any) => { teamMap[t.id] = t.name; });

  let m = `📋 <b>Partidos (${matches.length})</b>\n\n`;
  matches.forEach((x: any) => {
    const d = new Date(x.startTime).toLocaleString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const homeName = teamMap[x.realTeamHomeId] || '?';
    const awayName = teamMap[x.realTeamAwayId] || '?';
    m += `${x.status === 'OPEN' ? '🟢' : '🔴'} <b>${homeName}</b> vs <b>${awayName}</b>\n   📅 ${d} | 🆔 <code>${x.id.slice(0, 8)}</code>\n\n`;
  });
  await send(cid, m);
}

// ── Result + Score ──────────────────────────

async function cmdResultStart(s: any, cid: number) {
  const { data: matches } = await s.from('match_markets')
    .select('id, realTeamHomeId, realTeamAwayId')
    .in('status', ['OPEN', 'CLOSED'])
    .order('startTime');

  if (!matches?.length) return send(cid, '📭 No hay partidos pendientes.');

  // Fetch team names
  const teamIds = [...new Set(matches.flatMap((m: any) => [m.realTeamHomeId, m.realTeamAwayId]))];
  const { data: teams } = await s.from('real_teams').select('id, name').in('id', teamIds);
  const teamMap: Record<string, string> = {};
  teams?.forEach((t: any) => { teamMap[t.id] = t.name; });

  const btns = matches.flatMap((m: any) => {
    const homeName = teamMap[m.realTeamHomeId] || '?';
    const awayName = teamMap[m.realTeamAwayId] || '?';
    return [
      [{ text: `⚽ ${homeName} vs ${awayName}`, callback_data: 'noop' }],
      [
        { text: `🏠 ${homeName.split(' ')[0]}`, callback_data: `result:${m.id}:HOME_WIN` },
        { text: `🤝 Empate`, callback_data: `result:${m.id}:DRAW` },
        { text: `✈️ ${awayName.split(' ')[0]}`, callback_data: `result:${m.id}:AWAY_WIN` },
      ],
    ];
  });
  await sendKB(cid, '🏆 <b>Registrar Resultado</b>\n\nSelecciona quién ganó:', btns);
}

async function flowScore(s: any, cid: number, txt: string, st: any) {
  const match = txt.replace(/\s/g, '').match(/^(\d+)-(\d+)$/);
  if (!match) return send(cid, '❌ Escribe el marcador así: <code>2-1</code>');

  const homeScore = parseInt(match[1]);
  const awayScore = parseInt(match[2]);
  const matchId = st.data.matchId;
  const result = st.data.result;

  if (result === 'HOME_WIN' && homeScore <= awayScore) return send(cid, `❌ El marcador <b>${homeScore}-${awayScore}</b> no cuadra con victoria local.`);
  if (result === 'AWAY_WIN' && awayScore <= homeScore) return send(cid, `❌ El marcador <b>${homeScore}-${awayScore}</b> no cuadra con victoria visitante.`);
  if (result === 'DRAW' && homeScore !== awayScore) return send(cid, `❌ El marcador <b>${homeScore}-${awayScore}</b> no es empate.`);

  await send(cid, '⏳ Liquidando partido y pagando premios...');

  // Call settle_match_v2 RPC — handles everything atomically:
  // 1. Updates match status to FINISHED
  // 2. Evaluates all prediction tickets
  // 3. Pays winners
  // 4. Updates streaks
  const { data, error } = await s.rpc('settle_match_v2', {
    p_match_id: matchId,
    p_result: result,
  });

  await clearState(s, cid);

  if (error) {
    await send(cid, `❌ Error al liquidar: ${error.message}`);
    return;
  }

  const r = data || {};
  const lines = [
    `✅ <b>Partido Liquidado!</b>`,
    ``,
    `📊 Marcador: <b>${homeScore} - ${awayScore}</b>`,
    `🏆 Resultado: <b>${result === 'HOME_WIN' ? 'Victoria Local' : result === 'AWAY_WIN' ? 'Victoria Visitante' : 'Empate'}</b>`,
    ``,
    `📋 <b>Resumen de Liquidación:</b>`,
    `✅ Ganadores: <b>${r.winners || 0}</b>`,
    `❌ Perdedores: <b>${r.losers || 0}</b>`,
    `💰 Total pagado: <b>${(r.totalPaid || 0).toLocaleString()} CL</b>`,
    `📑 Tickets procesados: <b>${r.ticketsProcessed || 0}</b>`,
  ];
  await send(cid, lines.join('\n'));
}

// ── Logo Upload ─────────────────────────────

async function uploadLogo(s: any, cid: number, teamId: string, fileId: string) {
  try {
    await send(cid, '⏳ Subiendo escudo...');
    const { buffer, ext } = await downloadFile(fileId);
    const path = `logos/${teamId}.${ext}`;
    await s.storage.from('team-assets').upload(path, buffer, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`, upsert: true });
    const { data: u } = s.storage.from('team-assets').getPublicUrl(path);
    await s.from('real_teams').update({ logoUrl: u.publicUrl }).eq('id', teamId);
    await send(cid, `✅ Escudo actualizado!\n🖼 ${u.publicUrl}`);
  } catch (e: any) { await send(cid, `❌ Error: ${e.message}`); }
}

async function uploadPlayerPhoto(s: any, cid: number, playerId: string, fileId: string) {
  try {
    await send(cid, '⏳ Subiendo foto...');
    const { buffer, ext } = await downloadFile(fileId);
    const path = `players/${playerId}.${ext}`;
    await s.storage.from('team-assets').upload(path, buffer, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`, upsert: true });
    const { data: u } = s.storage.from('team-assets').getPublicUrl(path);
    // Note: real_players doesn't have photo_url in current schema
    // await s.from('real_players').update({ photoUrl: u.publicUrl }).eq('id', playerId);
    await send(cid, `✅ Foto subida!\n📸 ${u.publicUrl}`);
  } catch (e: any) { await send(cid, `❌ Error: ${e.message}`); }
}

// ── Delete ───────────────────────────────────

async function cmdDeleteStart(s: any, cid: number) {
  const { data: teams } = await s.from('real_teams').select('id, name').order('name');
  if (!teams?.length) return send(cid, '📭 No hay equipos.');
  await sendKB(cid, '🗑 <b>Eliminar Equipo</b>\n⚠️ Elimina equipo + jugadores.', teams.map((t: any) => ([{ text: `🗑 ${t.name}`, callback_data: `del_team:${t.id}` }])));
}

async function delTeam(s: any, cid: number, id: string) {
  const { data: t } = await s.from('real_teams').select('name').eq('id', id).single();
  await s.from('real_teams').delete().eq('id', id);
  await send(cid, `✅ <b>${t?.name}</b> eliminado.`);
}

async function delPlayer(s: any, cid: number, id: string) {
  const { data: p } = await s.from('real_players').select('name').eq('id', id).single();
  await s.from('real_players').delete().eq('id', id);
  await send(cid, `✅ <b>${p?.name}</b> eliminado.`);
}

// ── Pase Premium (antes Season Pass) ────────

async function cmdActivar(s: any, cid: number, txt: string) {
  const phone = txt.replace('/activar', '').trim();
  if (!phone) return send(cid, '📱 Uso: <code>/activar 3124183002</code>');

  // Find user by phone
  const { data: user, error: findErr } = await s.from('users').select('id, name, clCoins, accountTier').eq('phone', phone).single();
  if (findErr || !user) return send(cid, `❌ Usuario con teléfono <b>${phone}</b> no encontrado.`);

  // §3: Check if already PREMIUM
  if (user.accountTier === 'PREMIUM') {
    return send(cid, `⚠️ <b>${user.name}</b> ya tiene Pase Premium activo.`);
  }

  // Upgrade to PREMIUM + add 10,000 CL
  const newCoins = (user.clCoins || 0) + 10000;
  await s.from('users').update({ accountTier: 'PREMIUM', clCoins: newCoins }).eq('id', user.id);

  // Log transaction — §3: Pase Premium = $50.000 COP
  await s.from('transactions').insert({
    id: crypto.randomUUID(),
    userId: user.id,
    amountCOP: 50000,
    coinsAdded: 10000,
    type: 'PREMIUM_PASS',
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  });

  await send(cid, `✅ <b>Pase Premium Activado!</b>\n\n👤 ${user.name}\n📱 ${phone}\n🪙 +10,000 CL (Total: ${newCoins.toLocaleString()})\n⭐ Tier: PREMIUM`);
}

// ── Recargar (Vida Extra) ───────────────────

async function cmdRecargar(s: any, cid: number, txt: string) {
  const phone = txt.replace('/recargar', '').trim();
  if (!phone) return send(cid, '📱 Uso: <code>/recargar 3124183002</code>');

  const { data: user, error: findErr } = await s.from('users').select('id, name, clCoins, storedLifeSavers').eq('phone', phone).single();
  if (findErr || !user) return send(cid, `❌ Usuario con teléfono <b>${phone}</b> no encontrado.`);

  // §6 Bankruptcy Rule: balance must be < 2000 to recharge
  const currentBalance = user.clCoins || 0;
  if (currentBalance >= 2000) {
    return send(cid, `❌ <b>${user.name}</b> tiene ${currentBalance.toLocaleString()} 🪙 CL.\nSolo se puede recargar con saldo menor a 2,000 CL (Regla de Bancarrota §6).`);
  }

  // §6 Weekly Cap: max 2 recharges per week
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await s
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('userId', user.id)
    .eq('type', 'LIFESAVER_TOPUP')
    .eq('status', 'APPROVED')
    .gte('createdAt', oneWeekAgo);

  if ((count || 0) >= 2) {
    return send(cid, `❌ <b>${user.name}</b> ya usó sus 2 recargas semanales. Debe esperar a la próxima semana (§6).`);
  }

  // Add 5,000 CL
  const newCoins = currentBalance + 5000;
  await s.from('users').update({ clCoins: newCoins }).eq('id', user.id);

  // Log transaction — §3: Salvavidas = $20.000 COP
  await s.from('transactions').insert({
    id: crypto.randomUUID(),
    userId: user.id,
    amountCOP: 20000,
    coinsAdded: 5000,
    type: 'LIFESAVER_TOPUP',
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  });

  await send(cid, `✅ <b>Vida Extra!</b>\n\n👤 ${user.name}\n📱 ${phone}\n🪙 +5,000 CL (Total: ${newCoins.toLocaleString()})`);
}

// ── Usuarios ────────────────────────────────

async function cmdUsuarios(s: any, cid: number) {
  const { data: users, error } = await s.from('users').select('*');
  if (error) return send(cid, `❌ Error BD: ${error.message}`);
  if (!users?.length) return send(cid, '📭 No hay usuarios registrados.');

  let m = `👥 <b>Usuarios (${users.length})</b>\n\n`;
  users.forEach((u: any, i: number) => {
    const coins = u.clCoins ?? u.cl_coins ?? 0;
    const tier = (u.accountTier ?? u.account_tier) === 'PREMIUM' ? '⭐' : '🆓';
    const streak = u.currentStreak ?? u.current_streak ?? 0;
    const role = u.role === 'ADMIN' ? ' 👑' : '';
    m += `${i + 1}. ${tier} <b>${u.name}</b>${role}\n   📱 ${u.phone} | 🪙 ${coins} | 🔥 ${streak}\n\n`;
  });
  await send(cid, m);
}

// ── Crear Usuario ───────────────────────────

async function cmdCrear(s: any, cid: number, txt: string) {
  const parts = txt.replace('/crear', '').trim().split(/\s+/);
  if (parts.length < 3) {
    return send(cid, '📱 Uso: <code>/crear 3124183002 Nombre PIN</code>\n\nEjemplo: <code>/crear 3124183002 Juan 1234</code>');
  }

  const phone = parts[0];
  const name = parts[1];
  const pin = parts.slice(2).join(' ');

  if (pin.length < 4) {
    return send(cid, '❌ El PIN debe tener mínimo 4 caracteres.');
  }

  const fakeEmail = `${phone.replace(/\D/g, '')}@club90.app`;

  // Check if user already exists
  const { data: existing } = await s.from('users').select('id').eq('phone', phone).single();
  if (existing) {
    return send(cid, `❌ Ya existe un usuario con teléfono <b>${phone}</b>.`);
  }

  // Create auth user via Supabase Admin API (with c90_ padding)
  const { data: authUser, error: authErr } = await s.auth.admin.createUser({
    email: fakeEmail,
    password: `c90_${pin}`,
    email_confirm: true,
    user_metadata: { phone, name },
  });

  if (authErr) {
    return send(cid, `❌ Error Auth: ${authErr.message}`);
  }

  // Insert user profile
  const { error: profileErr } = await s.from('users').insert({
    id: authUser.user.id,
    phone,
    name,
    clCoins: 0,
    role: 'PLAYER',
    accountTier: 'GUEST',
    isBankrupt: false,
    currentStreak: 0,
    storedLifeSavers: 0
  });

  if (profileErr) {
    return send(cid, `⚠️ Auth creado pero error en perfil: ${profileErr.message}\nID: ${authUser.user.id}`);
  }

  await send(cid, `✅ <b>Usuario Creado!</b>\n\n👤 ${name}\n📱 ${phone}\n🔑 PIN configurado ✅\n🪙 0 CL COINS\n🆓 Tier: GUEST\n\nEl usuario ya puede entrar a Club 90+1 con su teléfono y PIN.`);
}
