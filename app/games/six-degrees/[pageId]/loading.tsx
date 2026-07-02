// app/games/six-degrees/[pageId]/loading.tsx

export default function Loading() {
  return (
    <div className="flex justify-center items-center rounded-lg min-h-screen bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700">
      <p className="text-xl animate-pulse">Loading Game...</p>
    </div>
  );
}
