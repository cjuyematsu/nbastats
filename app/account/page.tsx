// app/account/page.tsx

import type { Metadata } from 'next';
import AccountClient from './AccountClient';

export const metadata: Metadata = {
  title: 'Your Account | Hoops Data',
  description: 'Your game scores, streaks, and newsletter preferences.',
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return <AccountClient />;
}
