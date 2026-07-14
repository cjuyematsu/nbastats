// components/GameAbout.tsx
//
// Server-rendered crawlable text block for game pages. The game UIs are client
// components that SSR as loading states, so this is the only game copy search
// engines reliably see.

import Link from 'next/link';

export default function GameAbout({
  title,
  paragraphs,
}: {
  title: string;
  paragraphs: string[];
}) {
  return (
    <section className="w-full mt-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6 text-slate-700 dark:text-slate-300">
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">{title}</h2>
      {paragraphs.map((p) => (
        <p key={p.slice(0, 40)} className="mb-2 last:mb-0">
          {p}
        </p>
      ))}
      <p className="mt-3">
        <Link href="/games" className="text-sky-600 dark:text-sky-400 hover:underline">
          See all seven NBA trivia games
        </Link>
      </p>
    </section>
  );
}
