// app/games/draft-quiz/daily/opengraph-image.tsx

import { gameOgImage, GAME_OG_SIZE } from '@/lib/gameOg';

export const runtime = 'edge';
export const alt = 'Name That Pick daily challenge on HoopsData';
export const size = GAME_OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return gameOgImage({
    title: 'Name That Pick',
    tagline: "Today's five draft slots are missing their names. Fill them in from memory.",
    url: 'hoopsdata.net/games/draft-quiz/daily',
  });
}
