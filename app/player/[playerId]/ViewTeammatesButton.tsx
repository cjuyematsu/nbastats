'use client';

function scrollToTeammates() {
  const container = document.getElementById('page-scroll-container');
  const target = document.getElementById('teammates');
  if (!container || !target) return;
  const top =
    target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
  container.scrollTo({ top, behavior: 'smooth' });
}

export function ViewTeammatesButton() {
  return (
    <button
      type="button"
      onClick={scrollToTeammates}
      className="mb-6 inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-sky-500 dark:bg-sky-600 hover:bg-sky-600 dark:hover:bg-sky-700 text-white font-semibold transition-colors"
    >
      View most frequent teammates
    </button>
  );
}
