// lib/supabaseServerClient.ts

import { createClient } from '@supabase/supabase-js';

// These environment variables should already be in your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a Supabase client for server-side operations
export const supabaseServer = createClient(supabaseUrl, supabaseKey);