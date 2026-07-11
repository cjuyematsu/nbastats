// app/games/opengraph-image.tsx

import { gameOgImage, GAME_OG_SIZE } from '@/lib/gameOg';

export const runtime = 'edge';
export const alt = 'Seven daily NBA trivia games on HoopsData';
export const size = GAME_OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return gameOgImage({
    title: 'Seven Daily NBA Games',
    tagline: 'Six Degrees, Odd Man Out, Career Arc, and four more. New puzzles every day.',
    url: 'hoopsdata.net/games',
    eyebrow: 'HOOPSDATA',
  });
}
