'use client';

import React from 'react';
import Link from 'next/link';
import { buildCompareSlug } from '@/app/data/compareMatchups';
import { exploreLinksForNames } from '@/lib/compareExplore';

interface CompareExploreLinksProps {
  names: string[];
  isDarkMode: boolean;
}

export default function CompareExploreLinks({ names, isDarkMode }: CompareExploreLinksProps) {
  if (names.length < 2) return null;
  const excludeSlug = names.length === 2 ? buildCompareSlug(names[0], names[1]) : null;
  const links = exploreLinksForNames(names, excludeSlug);
  if (links.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className={`text-xl font-semibold mb-3 ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>Keep Exploring</h3>
      <div className="flex flex-wrap gap-4">
        {links.map((l) => (
          <Link
            key={l.slug}
            href={`/compare/${l.slug}`}
            className={isDarkMode ? 'text-sky-400 hover:underline' : 'text-sky-600 hover:underline'}
          >
            {l.a} vs {l.b}
          </Link>
        ))}
      </div>
    </div>
  );
}
