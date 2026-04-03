:: ============================================
:: CLUB 90 — Telegram Bot Setup Script
:: ============================================
:: Run this AFTER deploying the Edge Function
:: ============================================

@echo off
echo.
echo ========================================
echo  CLUB 90 - Telegram Bot Setup
echo ========================================
echo.

set BOT_TOKEN=8521113582:AAGxgOAzGLq2ONwDyulA0v6h7OEUWF8GGKc
set WEBHOOK_URL=https://zbzcamdgmukqqamjqcuy.supabase.co/functions/v1/telegram-admin

echo [1/3] Setting webhook...
curl -s -X POST "https://api.telegram.org/bot%BOT_TOKEN%/setWebhook" -d "url=%WEBHOOK_URL%"
echo.
echo.

echo [2/3] Setting bot commands...
curl -s -X POST "https://api.telegram.org/bot%BOT_TOKEN%/setMyCommands" -H "Content-Type: application/json" -d "[{\"command\":\"start\",\"description\":\"Menu principal\"},{\"command\":\"equipos\",\"description\":\"Ver todos los equipos\"},{\"command\":\"nuevo_equipo\",\"description\":\"Crear equipo nuevo\"},{\"command\":\"jugador\",\"description\":\"Agregar jugador\"},{\"command\":\"nomina\",\"description\":\"Ver nomina de equipo\"},{\"command\":\"logo\",\"description\":\"Subir escudo de equipo\"},{\"command\":\"partido\",\"description\":\"Crear partido\"},{\"command\":\"partidos\",\"description\":\"Ver partidos abiertos\"},{\"command\":\"resultado\",\"description\":\"Registrar resultado\"},{\"command\":\"eliminar_equipo\",\"description\":\"Eliminar equipo\"},{\"command\":\"cancelar\",\"description\":\"Cancelar operacion actual\"}]"
echo.
echo.

echo [3/3] Getting bot info...
curl -s -X GET "https://api.telegram.org/bot%BOT_TOKEN%/getMe"
echo.
echo.

echo ========================================
echo  DONE! Open Telegram and search for
echo  your bot to test it.
echo ========================================
pause
