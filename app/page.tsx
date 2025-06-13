// app/page.tsx
import Link from 'next/link'; 

export default function HomePage() {
  return (
    <div className="w-full bg-gray-800 rounded-lg shadow-2xl text-slate-100 flex flex-col flex-grow min-h-0"> 
      <main className="text-center max-w-3xl mx-auto">
        <header className="mb-10 md:mb-16">
          
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl pt-8">
            <span className="block text-sky-400">NBA Player Stats Hub</span> {/* Updated Title */}
            <span className="block text-slate-300 mt-1 sm:mt-2">
              Dive Deep into Player Performance
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-xl mx-auto">
            Explore comprehensive career statistics, play engaging stat-based games, and compare your favorite NBA players.
          </p>
        </header>

        <div className="mb-12 space-y-4 sm:space-y-0 sm:flex sm:justify-center sm:space-x-4">
          <Link
            href="/search" 
            className="inline-block w-full sm:w-auto px-8 py-3 bg-sky-600 text-white text-lg font-semibold rounded-lg shadow-md hover:bg-sky-700 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-75"
          >
            Search Player Stats
          </Link>
          <Link
            href="/games/stat-over-under" 
            className="inline-block w-full sm:w-auto px-8 py-3 bg-teal-500 text-white text-lg font-semibold rounded-lg shadow-md hover:bg-teal-600 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-opacity-75"
          >
            Play Stat Over/Under
          </Link>
        </div>

        <section className="mb-12 text-left sm:text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold text-sky-400 mb-4">About This Platform</h2>
          <p className="text-slate-300 leading-relaxed">
            
            Welcome! This is where you can write a little about your NBA stats, games, and features website.
          </p>
        </section>
        
        <section className="grid md:grid-cols-2 gap-8 mb-16 text-left">
          <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-sky-400 mb-2">Comprehensive Stats</h3>
            <p className="text-slate-400 text-sm">Access detailed career totals and per-game averages for a vast database of NBA players.</p>
          </div>
          <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-sky-400 mb-2">Engaging Games</h3>
            <p className="text-slate-400 text-sm">Test your NBA knowledge with fun, stat-based games like our daily Over/Under challenge.</p>
          </div>
        </section>

        <footer className="text-center pt-8 border-t border-slate-700">
          <p className="text-sm text-slate-500 pb-6">
            NBA Stats & Games Platform &copy; {new Date().getFullYear()}
          </p>
        </footer>
      </main>
    </div>
  );
}