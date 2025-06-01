// lib/supabaseClient.ts 

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
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
