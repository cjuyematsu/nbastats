// app/games/odd-man-out/opengraph-image.tsx

import { gameOgImage, GAME_OG_SIZE } from '@/lib/gameOg';

export const runtime = 'edge';
export const alt = 'Odd Man Out, the daily NBA trivia game on HoopsData';
export const size = GAME_OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return gameOgImage({
    title: 'Odd Man Out',
    tagline: 'Three of these players shared the court with the same star. One never did.',
    url: 'hoopsdata.net/games/odd-man-out',
  });
}
