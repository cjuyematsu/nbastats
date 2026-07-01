// lib/supabaseAdmin.ts
//
// Server-only Supabase client using the service-role key. It BYPASSES row-level
// security, so it must NEVER be imported from a client component or exposed via a
// NEXT_PUBLIC_* var. Use it only in API routes / server jobs (the review API and
// the article-generation cron).
//
// The real client is built lazily on first use, NOT at module load. `next build`
// imports route modules to collect page data, and that must not depend on runtime
// secrets (e.g. on Vercel where SUPABASE_SERVICE_ROLE_KEY isn't present at build).
// Constructing eagerly here would throw and fail the build.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

let client: SupabaseClient<Database> | null = null;

function getClient(): SupabaseClient<Database> {
  if (client) return client;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for the admin client.');
  }
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for the admin client.');
  }
  client = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

// Proxy so existing call sites keep using `supabaseAdmin.from(...)` unchanged, while
// the client (and its env-var check) is only created the first time it's actually used.
export const supabaseAdmin = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop, receiver) {
    const real = getClient();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === 'function' ? value.bind(real) : value;
  },
});
