// app/page.tsx
import PlayerSearchStats from "@/components/PlayerSearchStats"; 

export default function HomePage() {
  return (
    <div className="bg-slate-100 dark:bg-slate-900 py-8 min-h-screen">
      <main className="container mx-auto px-4"> 
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight sm:text-5xl md:text-6xl">
            NBA Player Career Statistics
          </h1>
          <p className="mt-4 text-xl text-slate-600 dark:text-slate-300">
            Search for NBA players and view their comprehensive career totals and averages.
          </p>
        </header>

        <PlayerSearchStats />

        <footer className="text-center mt-16 pt-8 pb-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            NBA Stats Viewer &copy; {new Date().getFullYear()}
          </p>
        </footer>
      </main>
    </div>
  );
}