// app/games/common-teammate/opengraph-image.tsx

import { gameOgImage, GAME_OG_SIZE } from '@/lib/gameOg';

export const runtime = 'edge';
export const alt = 'Common Teammate, the daily NBA connections game on HoopsData';
export const size = GAME_OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return gameOgImage({
    title: 'Common Teammate',
    tagline: 'Two stars who never played together. Name anyone who suited up with both.',
    url: 'hoopsdata.net/games/common-teammate',
  });
}
