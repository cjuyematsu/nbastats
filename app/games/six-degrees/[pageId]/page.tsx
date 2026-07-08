//app/games/six-degrees/[pageId]/page.tsx

import type { Metadata } from 'next';
import { cache } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getLaDateString, sixDegreesPuzzleNumber } from '@/lib/dailyTime';
import SixDegreesGameClient from './SixDegreesGameClient';

export const revalidate = 3600;

const getDailyPuzzle = cache(async (gameDate: string) => {
  try {
    const { data } = await supabase
      .from('daily_connection_games')
      .select('game_date, player_a_name, player_b_name')
      .eq('game_date', gameDate)
      .maybeSingle();
    return data;
  } catch {
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pageId: string }>;
}): Promise<Metadata> {
  const { pageId } = await params;

  if (pageId !== 'daily') {
    return {
      title: 'Six Degrees of NBA: Random Game',
      description: 'Connect two NBA players through a chain of former teammates.',
      robots: { index: false, follow: false },
    };
  }

  const daily = await getDailyPuzzle(getLaDateString());
  const title: Metadata['title'] = daily?.game_date
    ? { absolute: `Six Degrees #${sixDegreesPuzzleNumber(daily.game_date)}: ${daily.player_a_name} to ${daily.player_b_name}` }
    : 'Six Degrees of NBA: Daily Challenge';

  return {
    title,
    description:
      'Connect the two players through former teammates in 6 guesses. A new NBA puzzle every day.',
    alternates: { canonical: '/games/six-degrees/daily' },
  };
}

export default function SixDegreesGamePage() {
  return <SixDegreesGameClient />;
}
