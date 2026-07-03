// app/games/draft-quiz/daily/page.tsx

import type { Metadata } from 'next';
import DraftDailyClient from './DraftDailyClient';

export const metadata: Metadata = {
  title: 'Name That Pick: Daily NBA Draft Challenge',
  description:
    'A new NBA draft challenge every day. Name three top-5 picks from three different draft years, share your score, and keep your streak alive.',
  alternates: {
    canonical: '/games/draft-quiz/daily',
  },
  openGraph: {
    title: 'Name That Pick: Daily NBA Draft Challenge | HoopsData',
    description: 'Three top-5 picks from three different NBA drafts. Can you name them all? New challenge every day.',
    url: '/games/draft-quiz/daily',
  },
};

export default function DraftDailyPage() {
  return <DraftDailyClient />;
}
