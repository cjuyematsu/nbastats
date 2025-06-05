// app/page.tsx
import Link from 'next/link'; // For navigation buttons/links

export default function HomePage() {
  return (
    // Apply the gradient background and text color
    // Ensure full height and flex for centering content
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-gray-800 to-slate-900 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <main className="text-center max-w-3xl mx-auto">
        <header className="mb-10 md:mb-16">
          {/* Optional: Add your site logo here if you have one */}
          {/* <Image src="/your-nba-logo.png" alt="NBA Stats Logo" width={150} height={50} className="mx-auto mb-6" /> */}
          
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            <span className="block text-sky-400">NBA Player Stats Hub</span> {/* Updated Title */}
            <span className="block text-slate-300 mt-1 sm:mt-2">
              Dive Deep into Player Performance
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-xl mx-auto">
            Explore comprehensive career statistics, play engaging stat-based games, and compare your favorite NBA players.
          </p>
        </header>

        {/* Call to Action / Primary Link to your main features */}
        <div className="mb-12 space-y-4 sm:space-y-0 sm:flex sm:justify-center sm:space-x-4">
          <Link
            href="/search" // Or wherever your PlayerSearchStats component now lives
            className="inline-block w-full sm:w-auto px-8 py-3 bg-sky-600 text-white text-lg font-semibold rounded-lg shadow-md hover:bg-sky-700 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-75"
          >
            Search Player Stats
          </Link>
          <Link
            href="/games/stat-over-under" // Link to your game
            className="inline-block w-full sm:w-auto px-8 py-3 bg-teal-500 text-white text-lg font-semibold rounded-lg shadow-md hover:bg-teal-600 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-opacity-75"
          >
            Play Stat Over/Under
          </Link>
        </div>

        {/* Your Empty Paragraph Block */}
        <section className="mb-12 text-left sm:text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold text-sky-400 mb-4">About This Platform</h2>
          <p className="text-slate-300 leading-relaxed">
            {/* === START: YOUR EMPTY PARAGRAPH BLOCK === */}
            {/* Replace this comment with your description about your NBA stats site.
              For example:
              This platform offers an interactive way to explore historical and current
              NBA player statistics. Whether you're a fantasy basketball enthusiast, 
              a dedicated fan, or just curious about player performances, you can search,
              compare, and even test your knowledge with our stat-based games. 
              Our goal is to provide a rich and engaging experience for all NBA fans.
            */}
            Welcome! This is where you can write a little about your NBA stats, games, and features website.
            {/* === END: YOUR EMPTY PARAGRAPH BLOCK === */}
          </p>
        </section>
        
        {/* Optional: Feature Highlights Section */}
        <section className="grid md:grid-cols-2 gap-8 mb-16 text-left">
          <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-sky-400 mb-2">Comprehensive Stats</h3>
            <p className="text-slate-400 text-sm">Access detailed career totals and per-game averages for a vast database of NBA players.</p>
          </div>
          <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-sky-400 mb-2">Engaging Games</h3>
            <p className="text-slate-400 text-sm">Test your NBA knowledge with fun, stat-based games like our daily Over/Under challenge.</p>
          </div>
          {/* Add more feature highlights if you like */}
        </section>

        <footer className="text-center pt-8 border-t border-slate-700">
          <p className="text-sm text-slate-500">
            NBA Stats & Games Platform &copy; {new Date().getFullYear()}
          </p>
        </footer>
      </main>
    </div>
  );
}