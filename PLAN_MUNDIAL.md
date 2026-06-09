# PLAN_MUNDIAL.md — Club 90+1 · Edición Mundial 2026

> Documento de contexto maestro para Claude Code. Léelo completo antes de
> cualquier cambio. Regla de oro: **todo lo que no esté en el happy path se aplaza.**

---

## 0. Qué es esto (y qué NO es)

Club 90+1 es un **programa de lealtad gamificado** para un bar/licorera (piloto:
Pachanga, Bogotá). El cliente **gana** monedas virtuales (CL COINS) al **consumir
productos reales** en el local, y las usa para hacer **pronósticos** sobre partidos
de fútbol reales (arrancamos con el Mundial 2026) y canjear premios en un kiosco.

**Distinción legal y de negocio que define TODO el proyecto:**

- ✅ Las monedas se GANAN consumiendo. Son un cashback gamificado sobre una compra real.
- ❌ Las monedas NUNCA se VENDEN. El usuario jamás paga dinero a cambio de fichas para jugar.
- El dinero real solo entra por la compra de producto físico en el bar (que ya existe).
- Los pronósticos son un valor agregado gratuito sobre el consumo, no un servicio que se cobra.
- Los premios son beneficios del programa (en especie / patrocinados), nunca efectivo.

Esto lo clasifica como programa de fidelización, NO como apuesta. Mantener esta
línea es innegociable: es lo que separa el proyecto de una operación ilegal.

### Léxico obligatorio (en código y UI)
- USAR: pronóstico, ticket, multiplicador / factor, acierto, kiosco de recompensas, CL COINS.
- PROHIBIDO: apuesta, bet, apostar, casino, cuota, odd, azar, dinero, cash-out, stake.

### Líneas rojas (no implementar, vienen del blueprint viejo y quedan descartadas)
- ❌ Venta de monedas (Pase Premium / Salvavidas a cambio de transferencia). ELIMINADO.
- ❌ Vigorish diseñado "para quebrar" al usuario como motor de ingresos. ELIMINADO.
- ❌ Wall of Shame / calavera para humillar a quebrados. ELIMINADO.
- ❌ Botón MAX para fomentar impulsividad / mecánicas de FOMO predatorias. ELIMINADO.
- ❌ Recaudo de dinero por WhatsApp + Nequi por "fichas". ELIMINADO.

---

## 1. Economía de los CL COINS (parámetros fijos)

| Parámetro | Valor | Nota |
|---|---|---|
| Emisión | 10 COINS por cada 1.000 COP consumidos | 1 COIN = 100 COP gastados |
| Valor de redención | 1 COIN = 10 COP de valor en carta | Cashback percibido ≈ 10% |
| Rake del pozo de pronósticos | 20% | Destruye monedas, protege al bar |
| Expiración de monedas | 45 días | Cron en Supabase. Notificar antes de expirar |
| Tope de emisión | 5.000 COINS por usuario por noche | Anti-abuso |
| Multiplicador máximo | 5.00x | Truncar si la fórmula da más |
| Tope por pronóstico | 2.000 COINS por ticket | Evita distorsión del pozo |

**Costo real esperado para el bar:** ~1% de las ventas registradas.
**Techo estructural absoluto:** ~5% (breakage 0, todos canjean lo más caro). Nunca más.

**Liability viva** (métrica clave del dashboard del dueño):
`COINS en circulación × valor de redención × COGS de premios`. Mostrarla en tiempo real.

### Catálogo del kiosco (precios en COINS; sesgar lo alcanzable hacia COGS bajo)
- Shot 1.200 · Cerveza 1.500 · Cóctel 2.500 · Salta-fila VIP 3.000 (COGS $0)
- Balde 6.000 · Media botella 12.000 · Botella 20.000 · Mesa VIP próxima visita 30.000

---

> **Fuente de verdad única.** Documento maestro del proyecto. Antes se llamaba
> `CONTEXTO_CLUB90.md`; se renombró a `PLAN_MUNDIAL.md` (9-jun) para que el nombre del
> archivo coincida con el H1, con `wa-bot/CLAUDE.md` y con lo que referencia el código.
> El SRS viejo se archivó en `docs/archive/ERS_Club90_SRS.md` (OBSOLETO). Editar SIEMPRE aquí.

## 2. Arquitectura — qué se queda, se corta, se recablea, se agrega

### SE QUEDA (intacto)
- Frontend React 18 + Vite (estética neón/dark mode sirve perfecto para Mundial).
- Supabase (PostgreSQL) con RLS + transacciones atómicas.
- Auth JWT/PIN.
- Motor pari-mutuel — el activo más valioso. Solo dos parches (ver abajo).

### SE CORTA (v2, no ahora)
- GPT-4 Vision / validación de facturas con foto. Fuera del flujo principal.
- Party Mode (viralidad para escalar, no para validar).
- Multi-tenant / marca blanca. Una sola instancia, colores de Pachanga.
- Mercados internos (canciones, batallas de baile). El Mundial es el contenido.
- Bot de WhatsApp conversacional complejo → reducido a registro/login + notificaciones.

### SE RECABLEA
1. **Emisión de monedas → módulo de cajero** (reemplaza el OCR):
   - El cajero (con su PIN) digita el monto de venta.
   - Sistema genera código de 6 dígitos / QR con vencimiento de 10 min.
   - El cliente lo redime en la app y recibe sus COINS.
   - Tabla `emission_codes` (code, amount, cashier_id, status, expires_at).
2. **Motor pari-mutuel → dos parches:**
   - (a) Semilla de la casa: al crear el mercado, sembrar el pozo con monedas de la
     casa repartidas según probabilidades implícitas del partido (admin las carga).
     Estabiliza multiplicadores con pocos apostadores.
   - (b) Rake parametrizable (20% default); la semilla se recupera del rake.
3. **Economía → parámetros de la sección 1** como constantes de config + constraints.

### SE AGREGA (lo único realmente nuevo)
1. **Fixtures + odds + liquidación del Mundial (auto, API-Football PRO):** ver la
   decisión técnica completa en §7. Resumen: poller cada 3 h jala fixtures y odds
   pre-match dentro de la ventana de 14 días, rellena multiplicadores
   automáticamente, liquida con el resultado de la API. Cero intervención del dueño
   en el ciclo normal; queda un botón manual de liquidación solo como fallback.
2. **Modo TV:** ruta `/tv` de solo lectura, pantalla completa, para proyectar en el
   bar: pozo en vivo, multiplicadores moviéndose, leaderboard de mesas, últimas
   redenciones. Usa Supabase realtime. SIN esto el sistema es invisible y muere.
3. **Catálogo + redención QR:** recortar a 5-6 premios fijos; QR temporal que el
   cajero valida. Fallback rústico: código de 4 dígitos que el cliente muestra.

---

## 3. Retención (lo aprovechable del blueprint viejo, sin lo predatorio)
- **Dual leaderboard:** [Global] / [Rey de la Semana] (reinicia los lunes). SÍ.
- **Combinadas:** hasta 4 partidos por ticket, con "¡Casi ganas!" si falla por uno. SÍ,
  pero como feedback de juego, no como gancho para "recargar" (no hay recarga pagada).
- **Notificaciones WhatsApp:** "te expiran 800 COINS este viernes" / "arranca el
  partido en 10 min". Es la mejor arma de retención y excusa legítima de contacto.
- Premios alcanzables la misma noche (gancho inmediato) + premios aspiracionales que
  obligan a volver (retención + breakage).

---

## 4. Calendario contra el Mundial (arranca 11 jun, eliminatoria ~28 jun)

- **Semana 1 (jun 9–15):** poda de scope + módulo de cajero + parches del motor
  (semilla + rake) + parámetros de economía. Meta: flujo completo en staging
  (compra → código → monedas → pronóstico → liquidación manual).
- **Semana 2 (jun 16–22):** fixtures + panel de liquidación + modo TV + catálogo/
  redención. Meta: ensayo en seco con ~10 amigos en una noche real de Pachanga.
- **Semana 3 (jun 23–28):** correcciones del ensayo + catálogo real de Pachanga +
  capacitar cajeros/meseros (30 min, máx 2 pantallas) + LANZAMIENTO en el último
  partido de grupos de Colombia o el arranque de la eliminatoria.

**Happy path a proteger con la vida:** cliente escanea QR de mesa → se registra con su
número → cajero le carga monedas → pronostica el partido en pantalla → gana/pierde →
canjea o vuelve. Todo lo que no esté en esa línea recta se aplaza sin discusión.

---

## 5. Pendientes externos (no son código)
- Concepto jurídico con abogado que conozca Coljuegos ANTES de escalar más allá del
  piloto. El piloto de 1 mes en 1 bar puede correr discreto; escalar sin concepto, no.
- Habeas Data (Ley 1581): consentimiento + política de tratamiento para los datos que
  se capturan vía registro.
- WhatsApp: para producción usar API oficial (no Waha) por riesgo de baneo del número.

---

## 6. Costos de producción (trasladables al cliente)
> Costos recurrentes/operativos de correr el sistema en producción. Se facturan al
> cliente (Pachanga). Iremos sumando los demás (Supabase, dominio, WhatsApp API, etc.).

| # | Concepto | Costo | Estado | Nota |
|---|---|---|---|---|
| 1 | **API-Football — Plan PRO** | **USD $19 / mes** | ⏳ Por activar | Cubre Mundial 2026 (fixtures + odds pre-match), 7.500 req/día. Se suscribe cuando el cliente lo financie. **Trasladable al cliente.** |

---

## 7. Decisión técnica — Motor de cuotas automático (auto-odds)
> Confirmado con el dueño. Objetivo: **cero intervención manual** en el ciclo normal.
> El plan PRO de API-Football aún NO está activo y no hay API key todavía — el poller
> queda **diseñado y listo para conectar**, con la key como variable de entorno pendiente.

- **Motor vivo:** se mantiene el de multiplicador fijo (`match_markets` +
  `ticket_items.lockedMultiplier`, `submit_ticket`/`settle_match_v2`). NO se revive
  el motor de pozos muerto (`match_pools`/`place_bet`).
- **Poller (cada 3 h):** Edge Function programada recorre los fixtures del Mundial
  dentro de la **ventana de 14 días** (las odds pre-match solo existen 1–14 días
  antes y refrescan ~cada 3 h). Rellena/actualiza `multiplierHome/Draw/Away`.
- **Normalización de cuotas (clave):** las odds del bookmaker YA traen su margen
  (~5–8%). NO se suma 20% encima. Se hace:
  1. prob. justa: `p_i = (1/odd_i) / Σ(1/odd_j)`  ← quita el margen del bookmaker
  2. multiplicador: `mult_i = 1 / (p_i × 1.20)`     ← deja overround objetivo = 1.20
  3. cap 5.00 / piso 1.05 (estos topes rompen el 1.20 exacto en extremos; el tope manda).
  El rake del 20% **vive dentro del multiplicador** (el overround ES el rake); no se
  extrae aparte en la liquidación, solo se registra asiento contable si se quiere P&L.
- **`NEEDS_REVIEW`:** nuevo estado de `match_markets`. Si dentro de la ventana el
  fixture no trae odds, el mercado nace en `NEEDS_REVIEW` (no `OPEN`) → no se puede
  pronosticar sobre él; nunca se abre con números malos. `submit_ticket` solo acepta `OPEN`.
- **Liquidación:** automática con el resultado del endpoint de fixtures (mapea score
  → `HOME_WIN/DRAW/AWAY_WIN` → `settle_match_v2`). Se conserva un **botón manual de
  fallback** (admin) por si la API marca mal o tarda.
- **Bookmaker / bet type:** elegir un `bookmaker_id` determinista (o mediana de varios)
  vía `/odds/bookmakers`; el bet type es "Match Winner" (1X2) — confirmar `bet_id` en
  `/odds/bets`. Todo como config, no hardcode.
- **Pendiente del cliente antes de cablear:** activar plan PRO y entregar la API key
  (irá en env var `APIFOOTBALL_KEY`, nunca en el repo).

---

## 8. Estado actual
> Claude Code: actualiza esta sección al final de cada sesión. Qué quedó hecho, qué sigue.

### Sesión jun 9 — Módulo de cajero + decisiones auto-odds
**Hecho (compila, `npm run build` ✅):**
- [x] Decisiones auto-odds (§7) y Costos de producción (§6) documentadas aquí.
- [x] **Módulo de cajero** — migración `20260609120000_cashier_emission.sql`:
  tabla `emission_codes`, enums (`Role`+CASHIER, `EmissionStatus`, `TransactionType`+
  COINS_EARNED), RLS, y RPCs `create_emission_code` / `redeem_emission_code`.
  El canje acredita COINS + promueve a miembro activo (PREMIUM) y aplica tope 5.000/noche.
- [x] Frontend: `CashierPage` (ruta `/cashier`, solo CASHIER/ADMIN) + `RedeemCodeModal`
  (cliente digita código de 6 dígitos). Acceso a Caja en el drawer para cajeros.
- [x] **Poda (no destructiva):** la UI de "comprar monedas / Vida Extra" (TopAppBar,
  ProfilePage, SideDrawer) ahora abre el canje de código; `TopUpModal` desmontado.
- [x] **Poller** `supabase/functions/sync-odds/index.ts` — DISEÑADO, NO conectado
  (sale temprano si no hay `APIFOOTBALL_KEY`); `normalizeOdds()` ya implementada.

**Infra / Supabase:**
- Proyecto único `zbzcamdgmukqqamjqcuy` (`https://zbzcamdgmukqqamjqcuy.supabase.co`).
  Se trata como **staging** (sin usuarios reales todavía).
- ⚠️ **Política de backup:** a partir del ensayo en seco con usuarios reales (Semana 2),
  TODA migración requiere **backup previo** de la DB antes de aplicarse.

**Pendiente / siguiente:**
- [x] **Migración del cajero aplicada** (`20260609120000`) en `zbzcamdgmukqqamjqcuy` (9-jun).
- [x] **Smoke test verde** (`supabase/tests/cashier_smoke_test.sql`): las 3 pruebas pasaron
  — happy path (500 COINS + PREMIUM), tope 5.000/noche, código vencido rechazado.
- [ ] Crear el primer usuario CASHIER (rol) para Pachanga.
- [x] **🔴 Hueco de seguridad RLS CERRADO** (9-jun, aplicado + smoke test verde):
  - `20260609120300_harden_users_rls.sql` — blinda `role`/`accountTier`/`clCoins`/
    `storedLifeSavers` vía privilegios de columna (authenticated solo UPDATE de
    `name`/`realTeamId`). Verificado con `supabase/tests/users_rls_smoke_test.sql`.
  - `20260609120200_revoke_predatory_flows.sql` — REVOKE de funciones predatorias aplicado.
- [ ] Activar plan PRO de API-Football + entregar `APIFOOTBALL_KEY` y conectar el poller.