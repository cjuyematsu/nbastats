// app/games/ranking-game/opengraph-image.tsx

import { gameOgImage, GAME_OG_SIZE } from '@/lib/gameOg';

export const runtime = 'edge';
export const alt = 'Guess the Ranking, the daily NBA stats game on HoopsData';
export const size = GAME_OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return gameOgImage({
    title: 'Guess the Ranking',
    tagline: 'Four players, one stat category, one correct order. Drag them into place.',
    url: 'hoopsdata.net/games/ranking-game',
  });
}
