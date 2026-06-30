// lib/articleAdmin.ts
//
// Server-side admin authorization for the article review surface. Admin status
// is a flag on the user's profile row (public.players.is_admin), keyed to the
// Supabase auth user, not an env var. It's read with the service-role client so
// the flag can't be spoofed from the browser. NEVER import this from a client
// component (it pulls in the service-role key via supabaseAdmin).

import { createClient, type User } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Resolve the Supabase user from a request's `Authorization: Bearer` token, or null. */
export async function userFromRequest(request: Request): Promise<User | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length);
  const client = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);
  return error ? null : user;
}

/** True if the given user id is flagged admin in public.players. */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('players')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle();
  return !error && data?.is_admin === true;
}

export type AdminGate =
  | { ok: true; user: User }
  | { ok: false; status: number; message: string };

/** Verify the request comes from a signed-in admin (players.is_admin = true). */
export async function requireAdmin(request: Request): Promise<AdminGate> {
  const user = await userFromRequest(request);
  if (!user) return { ok: false, status: 401, message: 'Authentication failed.' };
  if (!(await isUserAdmin(user.id))) {
    return { ok: false, status: 403, message: 'Not authorized.' };
  }
  return { ok: true, user };
}
