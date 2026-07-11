// app/games/draft-quiz/opengraph-image.tsx

import { gameOgImage, GAME_OG_SIZE } from '@/lib/gameOg';

export const runtime = 'edge';
export const alt = 'Name That Pick, the NBA draft trivia game on HoopsData';
export const size = GAME_OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return gameOgImage({
    title: 'Name That Pick',
    tagline: 'NBA draft history with the names missing. How many picks can you fill in?',
    url: 'hoopsdata.net/games/draft-quiz',
  });
}
