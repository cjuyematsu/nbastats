// lib/supabaseAdmin.ts
//
// Server-only Supabase client using the service-role key. It BYPASSES row-level
// security, so it must NEVER be imported from a client component or exposed via a
// NEXT_PUBLIC_* var. Use it only in API routes / server jobs (e.g. the article
// generation cron and the review API).

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for the admin client.');
}
if (!serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for the admin client.');
}

export const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
