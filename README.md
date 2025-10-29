# Hoops Data

[![Next.js](https://img.shields.io/badge/Next.js-14+-black.svg)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green.svg)](https://supabase.com)

**A hub for NBA statistics, player comparisons, and basketball trivia games. Built with Next.js, TypeScript, Tailwind CSS, and Supabase.**

## About

Hoops Data is a comprehensive NBA statistics platform that provides tools for analyzing player performance, comparing careers, and testing basketball knowledge through interactive games. The application uses Supabase for backend data management and authentication.

## Features

### Player Statistics

**Compare Players**  
Side-by-side statistical comparison tool for settling basketball debates with hard data. Compare multiple players across various stat categories including career averages, per-game stats, and advanced metrics.

**Top 100 Players**  
Community-driven rankings of the top 100 NBA players in 2025. Vote to influence rankings and explore detailed player profiles with comprehensive statistics.

**Degrees of Separation**  
Discover connections between players across different eras through shared teammates. Visualize historical team rosters and player networks.

**Player Search**  
Global search functionality providing instant access to complete career statistics for any NBA player. Search from the header navigation to view detailed player profiles.

### Statistical Analysis

**Salary vs. Performance**  
Analysis of the relationship between player salaries and on-court production. Visualize contract efficiency and identify value players.

**NBA Growth Trends**  
Historical analysis showing how the league has evolved over time. Track changes in scoring, pace, efficiency, and playing styles across different eras.

**Points Leaders by Draft Position**  
Career points leaders at each draft position (picks 1-60). Identify draft value and compare historical draft performance.

### Trivia Games

**Stat Over/Under**  
Guess whether a player's statistical line is over or under a given threshold. Multiple difficulty levels with score tracking.

**Draft Quiz**  
Test your knowledge of NBA draft history by filling in missing picks. Covers multiple draft years with progressive difficulty.

**Guess the Ranking**  
Order players correctly based on their statistical rankings. Drag-and-drop interface with various stat categories and timed challenges.

**Odd Man Out**  
Identify which player doesn't belong in a group based on statistical patterns. Pattern recognition challenges with educational insights.

**Six Degrees**  
Connect two players through shared teammates. Find the shortest path between players across different teams and eras.

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL database, authentication, real-time subscriptions)
- **Deployment**: Vercel
- **Icons**: Lucide React

## Getting Started

### Prerequisites
- Node.js 18.0 or later
- Supabase account and project

### Installation

1. Clone the repository
```bash
git clone https://github.com/cjuyematsu/nbastats.git
cd nbastats
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables

Create a `.env` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server
```bash
npm run dev
```

5. Open http://localhost:3000

## Project Structure

```
app/
├── analysis
│   ├── draft-points
│   │   ├── DraftPointsClient.tsx
│   │   └── page.tsx
│   ├── growth-of-nba
│   │   ├── GrowthPageClient.tsx
│   │   └── page.tsx
│   └── salary-vs-points
│       ├── page.tsx
│       └── SalaryAnalysisClient.tsx
├── api
│   ├── degrees
│   │   └── route.ts
│   └── quiz
│       └── save
│           └── route.ts
├── compare
│   └── page.tsx
├── contexts
│   └── AuthContext.tsx
├── data
│   ├── draftData.ts
│   ├── salaryData.ts
│   └── viewershipData.ts
├── degrees-of-separation
│   ├── DegreesOfSeparationClient.tsx
│   └── page.tsx
├── favicon.ico
├── games
│   ├── draft-quiz
│   │   ├── [year]
│   │   │   └── page.tsx
│   │   ├── DraftQuizLobbyClient.tsx
│   │   └── page.tsx
│   ├── odd-man-out
│   │   ├── OddManOutClient.tsx
│   │   └── page.tsx
│   ├── ranking-game
│   │   ├── page.tsx
│   │   └── RankingGameClient.tsx
│   ├── six-degrees
│   │   ├── [pageId]
│   │   │   └── page.tsx
│   │   ├── page.tsx
│   │   └── SixDegreesLobbyClient.tsx
│   └── stat-over-under
│       ├── [era]
│       │   └── page.tsx
│       ├── page.tsx
│       └── SelectEraClient.tsx
├── globals.css
├── layout.tsx
├── page.tsx
├── player
│   └── [playerId]
│       └── page.tsx
├── signin
│   └── page.tsx
├── signup
│   └── page.tsx
├── sitemap.ts
└── top-100-players
    ├── page.tsx
    ├── Top100PlayersClient.tsx
    └── types.ts

```

## Deployment

The application is deployed on Vercel. 

## License

MIT License - see LICENSE file for details.

## Contact

- GitHub: [@cjuyematsu](https://github.com/cjuyematsu)
- Issues: [GitHub Issues](https://github.com/cjuyematsu/nbastats/issues)

---

Built with Next.js, TypeScript, and Supabase | © 2025 Hoops Data
