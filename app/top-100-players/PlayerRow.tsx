// app/top-100-players/PlayerRow.tsx

'use client';

import { memo, useState } from 'react';
import Link from 'next/link';
import type { PlayerRankingInfo, TopPlayer } from './types';

interface VotingButtonProps {
  onClick: () => void;
  isActive: boolean;
  disabled: boolean;
  ariaLabel: string;
  children: React.ReactNode;
  activeClass: string;
  inactiveClass: string;
}

const VotingButton: React.FC<VotingButtonProps> = ({
  onClick, isActive, disabled, ariaLabel, children, activeClass, inactiveClass,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    className={`flex items-center justify-center gap-0.5 sm:gap-1 min-w-[2rem] sm:min-w-[2.5rem] min-h-[2.5rem] px-1 sm:px-1.5 rounded-md transition-colors text-xs focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed ${isActive ? activeClass : inactiveClass}`}
  >
    {children}
  </button>
);

interface PlayerRowProps {
  player: TopPlayer;
  rankingInfo?: PlayerRankingInfo;
  onVote: (playerId: number, newVoteType: number) => Promise<void>;
  isVoting: boolean;
  isHighlighted: boolean;
}

const PlayerRow = memo(function PlayerRow({ player, rankingInfo, onVote, isVoting, isHighlighted }: PlayerRowProps) {
  const [expanded, setExpanded] = useState(false);

  const change = rankingInfo?.weeklyChange ?? 0;
  const isNew = (rankingInfo?.history?.length ?? 0) === 0;
  const trendRanks = (rankingInfo?.history ?? []).slice(-4).map((h) => h.rank_position);

  const handleVoteClick = (voteTypeClicked: number) => {
    const newVoteType = player.currentUserVote === voteTypeClicked ? 0 : voteTypeClicked;
    onVote(player.personId, newVoteType);
  };

  const stats = [
    { label: 'PTS', value: player.pointsPerGame?.toFixed(1) ?? 'N/A' },
    { label: 'REB', value: player.reboundsPerGame?.toFixed(1) ?? 'N/A' },
    { label: 'AST', value: player.assistsPerGame?.toFixed(1) ?? 'N/A' },
    { label: 'STL', value: player.stealsPerGame?.toFixed(1) ?? 'N/A' },
    { label: 'BLK', value: player.blocksPerGame?.toFixed(1) ?? 'N/A' },
    { label: 'TS%', value: player.trueShootingPercentage !== null ? (player.trueShootingPercentage * 100).toFixed(1) : 'N/A' },
    { label: 'FG%', value: player.fieldGoalPercentage !== null ? (player.fieldGoalPercentage * 100).toFixed(1) : 'N/A' },
    { label: '3P%', value: player.threePointPercentage !== null ? (player.threePointPercentage * 100).toFixed(1) : 'N/A' },
    { label: 'FT%', value: player.freeThrowPercentage !== null ? (player.freeThrowPercentage * 100).toFixed(1) : 'N/A' },
    { label: 'GP', value: String(player.gamesPlayed ?? 'N/A') },
  ];

  return (
    <li
      id={`player-card-${player.personId}`}
      className={`scroll-mt-24 ${isHighlighted ? 'ring-2 ring-inset ring-sky-500' : ''}`}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        className="flex items-center gap-1.5 sm:gap-3 px-2 py-2 sm:px-3 cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
      >
        <span className="w-9 sm:w-10 flex-none flex flex-col items-center">
          <span className="text-sm font-bold tabular-nums text-slate-400 dark:text-slate-500">
            {player.rankNumber}
          </span>
          <span className="text-[10px] font-bold leading-tight">
            {isNew ? (
              <span className="text-sky-600 dark:text-sky-400">NEW</span>
            ) : change > 0 ? (
              <span className="text-green-600 dark:text-green-400">▲{change}</span>
            ) : change < 0 ? (
              <span className="text-red-500 dark:text-red-400">▼{Math.abs(change)}</span>
            ) : (
              <span className="text-slate-400 dark:text-slate-500">▬</span>
            )}
          </span>
        </span>
        <span className="min-w-0 flex-1 flex items-center gap-2">
          <Link
            href={`/player/${player.personId}`}
            onClick={(e) => e.stopPropagation()}
            className="truncate text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
          >
            {player.firstName} {player.lastName}
          </Link>
          {player.gamesPlayed === 0 && (
            <span className="flex-none inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700">
              INJURED
            </span>
          )}
          {player.seasonYear === 2025 && (
            <span className="flex-none hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              2025 Stats
            </span>
          )}
        </span>
        {player.pointsPerGame != null && (
          <span className="hidden sm:block w-20 flex-none text-right text-sm tabular-nums text-slate-600 dark:text-slate-300">
            {player.pointsPerGame.toFixed(1)} <span className="text-xs text-slate-400 dark:text-slate-500">PPG</span>
          </span>
        )}
        <span className="flex flex-none items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <VotingButton
            onClick={() => handleVoteClick(1)}
            isActive={player.currentUserVote === 1}
            disabled={isVoting}
            ariaLabel={`Upvote ${player.firstName} ${player.lastName}`}
            activeClass="bg-green-500 text-white hover:bg-green-600"
            inactiveClass="bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-green-600 dark:text-green-300 hover:text-green-700 dark:hover:text-green-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
            <span className="font-semibold text-xs">{player.upvotes}</span>
          </VotingButton>
          <VotingButton
            onClick={() => handleVoteClick(2)}
            isActive={player.currentUserVote === 2}
            disabled={isVoting}
            ariaLabel={`Confirm spot for ${player.firstName} ${player.lastName}`}
            activeClass="bg-sky-500 text-white hover:bg-sky-600"
            inactiveClass="bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-sky-600 dark:text-sky-300 hover:text-sky-700 dark:hover:text-sky-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            <span className="font-semibold text-xs">{player.sameSpotVotes}</span>
          </VotingButton>
          <VotingButton
            onClick={() => handleVoteClick(-1)}
            isActive={player.currentUserVote === -1}
            disabled={isVoting}
            ariaLabel={`Downvote ${player.firstName} ${player.lastName}`}
            activeClass="bg-red-500 text-white hover:bg-red-600"
            inactiveClass="bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-red-500 dark:text-red-300 hover:text-red-600 dark:hover:text-red-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
            <span className="font-semibold text-xs">{player.downvotes}</span>
          </VotingButton>
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={3}
          stroke="currentColor"
          className={`hidden sm:block w-3.5 h-3.5 flex-none text-slate-400 dark:text-slate-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </div>
      {expanded && (
        <div className="px-3 pb-3 sm:pl-16">
          <div className="grid grid-cols-5 gap-x-3 gap-y-2 max-w-md">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col">
                <span className="text-xs text-sky-600 dark:text-sky-400">{stat.label}</span>
                <span className="text-sm font-bold text-slate-700 dark:text-sky-200">{stat.value}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {isNew ? (
              'New this cycle'
            ) : (
              <>
                Rank trend:{' '}
                {trendRanks.map((rank, i) => (
                  <span key={i}>
                    {rank}
                    <span className="mx-1 text-slate-400 dark:text-slate-500">&gt;</span>
                  </span>
                ))}
                <span className="font-bold text-sky-600 dark:text-sky-400">{player.rankNumber}</span>
              </>
            )}
          </p>
        </div>
      )}
    </li>
  );
});

export default PlayerRow;
