import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';

// A type definition for the data we expect from our database function
type QuizProgress = {
  year: number;
  correct_count: number;
  total_count: number;
};

async function getLobbyData() {
  // The `cookies()` function needs to be invoked to get the cookie store.
  const cookieStore = cookies();
  
  // Now, pass the cookie store to the Supabase client.
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  // Get the current logged-in user's session from the server-side cookies
  const { data: { session } } = await supabase.auth.getSession();

  // Call our efficient database function with the user's ID.
  // If the user is not logged in, we pass null, and they will see 0 for all scores.
  const { data, error } = await supabase.rpc('get_user_quiz_summary', {
    p_user_id: session?.user?.id ?? null
  });

  if (error) {
    console.error("Error fetching quiz summary:", error.message);
    return [];
  }

  return (data as QuizProgress[]) || [];
}

export default async function DraftQuizLobby() {
  const progressData = await getLobbyData();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">NBA Draft Quiz</h1>
      <p className="text-center mb-8">Select a year to progressively fill in the draft board.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {progressData.map(item => (
          <Link
            key={item.year}
            href={`/games/draft-quiz/${item.year}`}
            className="block p-4 bg-gray-800 rounded-lg hover:bg-blue-600 transition-colors"
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-2xl">{item.year}</span>
              {/* Always show the score, even if it's 0 */}
              <span className="text-sm font-medium bg-gray-700 text-blue-300 px-2 py-1 rounded">
                {item.correct_count} / {item.total_count}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}