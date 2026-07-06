// components/EmbedAttribution.tsx
//
// Followed attribution link shown inside every embed widget. It links to the
// full page on hoopsdata.net and opens in a new tab (breaking out of the host
// iframe). Deliberately no rel="nofollow".

export default function EmbedAttribution({ href }: { href: string }) {
  return (
    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-600 text-center text-xs text-slate-500 dark:text-slate-400">
      Data by{' '}
      <a
        href={`https://hoopsdata.net${href}`}
        target="_blank"
        rel="noopener"
        className="font-semibold text-sky-600 dark:text-sky-400 hover:underline"
      >
        Hoops Data
      </a>
    </div>
  );
}
