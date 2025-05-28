// lib/supabaseClient.ts (or src/lib/supabaseClient.ts)

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;


if (!supabaseUrl) {
  throw new Error("Supabase URL is required. Check your .env.local file for NEXT_PUBLIC_SUPABASE_URL.");
}
if (!supabaseAnonKey) {
  throw new Error("Supabase Anon Key is required. Check your .env.local file for NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

// Explicitly type the client if you intend to use generic types with it later,
// though createClient is well-typed by default.
// You can also define your database schema type here for better type safety with Supabase.
// For now, we'll use the default inferred type.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
