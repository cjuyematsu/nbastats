// app/games/career-arc/opengraph-image.tsx

import { gameOgImage, GAME_OG_SIZE } from '@/lib/gameOg';

export const runtime = 'edge';
export const alt = 'Career Arc, the daily NBA guessing game on HoopsData';
export const size = GAME_OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return gameOgImage({
    title: 'Career Arc',
    tagline: "A mystery player's scoring curve, season by season. Guess who from the shape alone.",
    url: 'hoopsdata.net/games/career-arc',
  });
}
