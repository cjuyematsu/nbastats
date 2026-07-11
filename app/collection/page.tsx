// app/collection/page.tsx
//
// The player collection: personal, device-local (localStorage), so the page
// is noindex. The client component owns all reads.

import type { Metadata } from 'next';
import CollectionClient from './CollectionClient';

export const metadata: Metadata = {
  title: 'My Player Collection',
  description:
    'Every NBA player you have collected by winning HoopsData daily games. Win a game to collect its players.',
  robots: { index: false },
};

export default function CollectionPage() {
  return <CollectionClient />;
}
