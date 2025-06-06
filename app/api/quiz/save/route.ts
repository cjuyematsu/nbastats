// /api/quiz/save/route.ts

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// We can use the environment variables directly in the route handler.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: Request) {
  try {
    const { draft_year, guessed_ids } = await request.json();

    // 1. Get the Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Authorization header is missing or invalid.' },
        { status: 401 }
      );
    }
    const token = authHeader.split(' ')[1];

    // 2. Create a temporary, ANONYMOUS client to validate the token.
    // This is just to check if the user's token is valid.
    const tempSupabaseClient = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error: userError } = await tempSupabaseClient.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ message: 'Authentication failed.' }, { status: 401 });
    }

    // 3. THIS IS THE KEY: Create a NEW client that is authenticated AS THE USER.
    // We inject the user's token directly into this client's headers.
    const supabaseAsUser = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // 4. Perform the upsert with the user-authenticated client.
    // Now, when this request hits the database, auth.uid() will be correctly populated.
    const { error: upsertError } = await supabaseAsUser
      .from('quiz_attempts')
      .upsert(
        {
          user_id: user.id,
          draft_year: draft_year,
          guessed_ids: guessed_ids,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,draft_year',
        }
      );

    if (upsertError) {
      console.error('Error saving quiz progress:', upsertError);
      return NextResponse.json(
        { message: `Database error: ${upsertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Progress saved successfully!' }, { status: 200 });

  } catch {
    console.log("error");
  }
}