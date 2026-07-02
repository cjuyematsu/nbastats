// app/loading.tsx

export default function Loading() {
  return (
    <div className="w-full min-h-screen rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
      <div className="max-w-3xl mx-auto animate-pulse space-y-6 pt-8">
        <div className="h-8 w-2/3 mx-auto rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-1/2 mx-auto rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-700/60" />
        <div className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-700/60" />
      </div>
    </div>
  );
}
