// app/games/stat-over-under/opengraph-image.tsx

import { gameOgImage, GAME_OG_SIZE } from '@/lib/gameOg';

export const runtime = 'edge';
export const alt = 'Stat Over/Under, the daily NBA stats game on HoopsData';
export const size = GAME_OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return gameOgImage({
    title: 'Stat Over/Under',
    tagline: 'Ten stat lines. Call each one over or under. Harder than it sounds.',
    url: 'hoopsdata.net/games/stat-over-under',
  });
}
