// ============================================
// CLUB 90 — WhatsApp Bot Configuration
// ============================================
// Validates all required environment variables
// at startup using Zod schema.

import { z } from 'zod';
import { config as dotenvConfig } from 'dotenv' ;

// Load .env file (local dev only — Render uses dashboard)
dotenvConfig();

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  SUPABASE_FUNCTIONS_URL: z.string().url('SUPABASE_FUNCTIONS_URL must be a valid URL'),
  WHATSAPP_WEBHOOK_SECRET: z.string().min(8, 'WHATSAPP_WEBHOOK_SECRET must be at least 8 chars'),
  BOT_ADMIN_NUMBER: z.string().regex(/^\d{10,15}$/, 'BOT_ADMIN_NUMBER must be 10-15 digits'),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ [Config] Missing or invalid environment variables:');
    result.error.issues.forEach((issue) => {
      console.error(`   → ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }

  return result.data;
}

export const ENV = loadConfig();
