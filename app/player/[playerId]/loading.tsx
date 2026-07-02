// app/player/[playerId]/loading.tsx

export default function Loading() {
  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="p-4 md:py-6">
        <div className="p-5 bg-gray-50 dark:bg-slate-700/60 rounded-xl shadow-md border border-gray-200 dark:border-slate-600 animate-pulse">
          <div className="h-9 w-64 rounded bg-slate-200 dark:bg-slate-600 mb-2" />
          <div className="h-6 w-40 rounded bg-slate-200 dark:bg-slate-600 mb-8" />
          {[0, 1].map((i) => (
            <div key={i} className="mb-8">
              <div className="h-7 w-72 rounded bg-slate-200 dark:bg-slate-600 mb-4" />
              <div className="h-10 rounded bg-slate-200 dark:bg-slate-600 mb-2" />
              <div className="h-10 rounded bg-slate-100 dark:bg-slate-700 mb-2" />
              <div className="h-10 rounded bg-slate-100 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
